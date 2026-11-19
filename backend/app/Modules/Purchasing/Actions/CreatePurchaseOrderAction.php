<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Core\Domain\ValueObjects\Money;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Purchasing\Models\PurchaseOrder;
use App\Modules\Purchasing\Models\PurchaseOrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreatePurchaseOrderAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(int $organizationId, int $actorId, array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($organizationId, $actorId, $data): PurchaseOrder {
            $subtotal = Money::zero();
            $discountTotal = Money::zero();
            $taxTotal = Money::zero();
            $grandTotal = Money::zero();

            $po = PurchaseOrder::query()->create([
                'organization_id' => $organizationId,
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'po_number' => 'PO-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'expected_date' => $data['expected_date'] ?? null,
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
                'created_by' => $actorId,
            ]);

            /** @var list<array<string, mixed>> $items */
            $items = is_array($data['items'] ?? null) ? $data['items'] : [];

            foreach ($items as $item) {
                /** @var ProductVariant $variant */
                $variant = ProductVariant::query()->with('product')->findOrFail($item['product_variant_id']);

                $qtyStr = is_scalar($item['qty_ordered']) ? (string) $item['qty_ordered'] : '0';
                $priceStr = is_scalar($item['unit_price']) ? (string) $item['unit_price'] : '0';
                $discStr = is_scalar($item['discount_amount'] ?? null) ? (string) $item['discount_amount'] : '0';
                $taxRateStr = is_scalar($item['tax_rate'] ?? null) ? (string) $item['tax_rate'] : '0';

                $unitPrice = Money::of($priceStr);
                $lineGross = $unitPrice->multiply($qtyStr);
                $lineDiscount = Money::of($discStr);
                $taxable = $lineGross->subtract($lineDiscount);
                $lineTax = $taxable->percentage($taxRateStr);
                $lineTotal = $taxable->add($lineTax);

                PurchaseOrderItem::query()->create([
                    'purchase_order_id' => $po->id,
                    'product_variant_id' => $variant->id,
                    'sku_snapshot' => $variant->sku,
                    'product_name_snapshot' => $variant->name,
                    'qty_ordered' => $qtyStr,
                    'qty_received' => '0.0000',
                    'unit_price' => $unitPrice->toDecimal(),
                    'discount_amount' => $lineDiscount->toDecimal(),
                    'tax_rate' => $taxRateStr,
                    'tax_amount' => $lineTax->toDecimal(),
                    'line_total' => $lineTotal->toDecimal(),
                ]);

                $subtotal = $subtotal->add($lineGross);
                $discountTotal = $discountTotal->add($lineDiscount);
                $taxTotal = $taxTotal->add($lineTax);
                $grandTotal = $grandTotal->add($lineTotal);
            }

            $po->update([
                'subtotal' => $subtotal->toDecimal(),
                'discount_total' => $discountTotal->toDecimal(),
                'tax_total' => $taxTotal->toDecimal(),
                'grand_total' => $grandTotal->toDecimal(),
            ]);

            $this->auditLogger->log(
                module: 'Purchasing',
                action: 'purchase_order.created',
                entityType: PurchaseOrder::class,
                entityId: $po->id,
                newValues: ['po_number' => $po->po_number, 'grand_total' => $grandTotal->toDecimal()],
                organizationId: $organizationId,
                userId: $actorId,
            );

            return $po->refresh()->load(['supplier', 'warehouse', 'items']);
        });
    }
}
