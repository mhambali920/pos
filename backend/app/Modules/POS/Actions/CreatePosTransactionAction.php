<?php

declare(strict_types=1);

namespace App\Modules\POS\Actions;

use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\Core\Domain\ValueObjects\Money;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Product\Services\PriceResolverService;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Models\SaleItem;
use App\Modules\Store\Models\Store;
use App\Modules\Tax\Services\TaxCalculator;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final readonly class CreatePosTransactionAction
{
    public function __construct(
        private PriceResolverService $priceResolver,
        private TaxCalculator $taxCalculator,
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $cashier, Store $store, array $data): Sale
    {
        return DB::transaction(function () use ($cashier, $store, $data): Sale {
            $warehouseId = isset($data['warehouse_id']) && is_numeric($data['warehouse_id'])
                ? (int) $data['warehouse_id']
                : $this->resolveDefaultWarehouseId($store);

            $isHold = ($data['hold'] ?? false) === true;

            $sessionId = isset($data['cash_register_session_id']) && is_numeric($data['cash_register_session_id'])
                ? (int) $data['cash_register_session_id']
                : CashRegisterSession::query()
                    ->where('store_id', $store->id)
                    ->where('user_id', $cashier->id)
                    ->where('status', 'open')
                    ->orderByDesc('opened_at')
                    ->orderByDesc('id')
                    ->value('id');

            $sale = Sale::query()->create([
                'organization_id' => $store->organization_id,
                'store_id' => $store->id,
                'warehouse_id' => $warehouseId,
                'cash_register_session_id' => $sessionId,
                'customer_id' => $data['customer_id'] ?? null,
                'cashier_id' => $cashier->id,
                'transaction_number' => 'POS-'.$store->code.'-'.now()->format('YmdHis').'-'.strtoupper(Str::random(4)),
                'status' => $isHold ? 'held' : 'pending_payment',
                'notes' => $data['notes'] ?? null,
            ]);

            $subtotal = Money::zero();
            $discountTotal = Money::zero();
            $taxTotal = Money::zero();
            $grandTotal = Money::zero();

            /** @var list<array<string, mixed>> $items */
            $items = is_array($data['items'] ?? null) ? $data['items'] : [];

            foreach ($items as $index => $itemData) {
                /** @var ProductVariant $variant */
                $variant = ProductVariant::query()
                    ->with(['product.baseUnit', 'product.tax', 'barcodes'])
                    ->whereHas('product', fn ($q) => $q->where('organization_id', $store->organization_id))
                    ->findOrFail($itemData['product_variant_id']);

                $resolved = $this->priceResolver->resolve($variant, $store->id);
                $unitPrice = $resolved['selling_price'];

                if (isset($itemData['price_override']) && is_numeric($itemData['price_override'])) {
                    if (! $cashier->can('pos.override_price')) {
                        throw ValidationException::withMessages([
                            "items.{$index}.price_override" => ['You do not have permission to override prices.'],
                        ]);
                    }

                    $overrideMoney = Money::of((string) $itemData['price_override']);
                    if (! $overrideMoney->isGreaterThanOrEqual($resolved['min_selling_price'])) {
                        throw ValidationException::withMessages([
                            "items.{$index}.price_override" => [
                                "Price override cannot be below minimum selling price ({$resolved['min_selling_price']->toDecimal()}).",
                            ],
                        ]);
                    }

                    $this->auditLogger->log(
                        module: 'POS',
                        action: 'pos.price_overridden',
                        entityType: Sale::class,
                        entityId: $sale->id,
                        oldValues: ['unit_price' => $unitPrice->toDecimal()],
                        newValues: ['unit_price' => $overrideMoney->toDecimal(), 'sku' => $variant->sku],
                        organizationId: $store->organization_id,
                        storeId: $store->id,
                        userId: $cashier->id,
                    );

                    $unitPrice = $overrideMoney;
                }

                $qtyStr = is_scalar($itemData['quantity']) ? (string) $itemData['quantity'] : '1';
                $lineGross = $unitPrice->multiply($qtyStr);

                $discStr = is_scalar($itemData['discount_amount'] ?? null) ? (string) $itemData['discount_amount'] : '0';
                $lineDiscount = Money::of($discStr);
                if (! $lineGross->isGreaterThanOrEqual($lineDiscount)) {
                    throw ValidationException::withMessages([
                        "items.{$index}.discount_amount" => ['Item discount cannot exceed line gross amount.'],
                    ]);
                }

                $afterDiscount = $lineGross->subtract($lineDiscount);
                $taxModel = $variant->product?->tax;
                /** @var numeric-string $taxRate */
                $taxRate = $taxModel !== null && is_numeric($taxModel->rate) ? $taxModel->rate : '0.0000';
                $taxType = $taxModel !== null ? $taxModel->type : 'exclusive';

                $taxResult = $this->taxCalculator->calculate($afterDiscount, $taxRate, $taxType);
                $primaryBarcode = $variant->barcodes->firstWhere('is_primary', true) ?? $variant->barcodes->first();

                SaleItem::query()->create([
                    'sale_id' => $sale->id,
                    'product_variant_id' => $variant->id,
                    'sku_snapshot' => $variant->sku,
                    'barcode_snapshot' => $primaryBarcode?->barcode,
                    'product_name_snapshot' => $variant->name,
                    'unit_name_snapshot' => $variant->product?->baseUnit?->code,
                    'quantity' => $qtyStr,
                    'unit_price_snapshot' => $unitPrice->toDecimal(),
                    'cost_price_snapshot' => $variant->average_cost,
                    'discount_amount' => $lineDiscount->toDecimal(),
                    'tax_rate_snapshot' => $taxRate,
                    'tax_type_snapshot' => $taxType,
                    'tax_amount' => $taxResult['tax_amount']->toDecimal(),
                    'line_total' => $taxResult['total_amount']->toDecimal(),
                ]);

                $subtotal = $subtotal->add($lineGross);
                $discountTotal = $discountTotal->add($lineDiscount);
                $taxTotal = $taxTotal->add($taxResult['tax_amount']);
                $grandTotal = $grandTotal->add($taxResult['total_amount']);
            }

            $cartDiscountStr = is_scalar($data['cart_discount'] ?? null) ? (string) $data['cart_discount'] : '0';
            $cartDiscount = Money::of($cartDiscountStr);
            if (! $cartDiscount->isZero()) {
                if (! $grandTotal->isGreaterThanOrEqual($cartDiscount)) {
                    throw ValidationException::withMessages([
                        'cart_discount' => ['Cart discount cannot exceed grand total.'],
                    ]);
                }
                $discountTotal = $discountTotal->add($cartDiscount);
                $grandTotal = $grandTotal->subtract($cartDiscount);
            }

            $sale->update([
                'subtotal' => $subtotal->toDecimal(),
                'discount_total' => $discountTotal->toDecimal(),
                'tax_total' => $taxTotal->toDecimal(),
                'grand_total' => $grandTotal->toDecimal(),
            ]);

            return $sale->refresh()->load(['items', 'payments.method', 'customer', 'cashier']);
        });
    }

    private function resolveDefaultWarehouseId(Store $store): int
    {
        $warehouse = Warehouse::query()
            ->where('organization_id', $store->organization_id)
            ->where(function ($q) use ($store): void {
                $q->where('store_id', $store->id)->orWhereNull('store_id');
            })
            ->orderByDesc('store_id')
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();

        if (! $warehouse instanceof Warehouse) {
            throw ValidationException::withMessages([
                'warehouse_id' => ['No active warehouse configured for this store.'],
            ]);
        }

        return $warehouse->id;
    }
}
