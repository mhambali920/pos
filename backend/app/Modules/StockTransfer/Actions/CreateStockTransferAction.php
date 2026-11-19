<?php

declare(strict_types=1);

namespace App\Modules\StockTransfer\Actions;

use App\Modules\Product\Models\ProductVariant;
use App\Modules\StockTransfer\Models\StockTransfer;
use App\Modules\StockTransfer\Models\StockTransferItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreateStockTransferAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(int $organizationId, int $actorId, array $data): StockTransfer
    {
        return DB::transaction(function () use ($organizationId, $actorId, $data): StockTransfer {
            $transfer = StockTransfer::query()->create([
                'organization_id' => $organizationId,
                'transfer_number' => 'TRF-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'from_warehouse_id' => $data['from_warehouse_id'],
                'to_warehouse_id' => $data['to_warehouse_id'],
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
                'created_by' => $actorId,
            ]);

            /** @var list<array<string, mixed>> $items */
            $items = is_array($data['items'] ?? null) ? $data['items'] : [];
            foreach ($items as $item) {
                $variant = ProductVariant::query()->find($item['product_variant_id']);
                StockTransferItem::query()->create([
                    'stock_transfer_id' => $transfer->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'batch_id' => $item['batch_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_cost' => $variant instanceof ProductVariant ? $variant->average_cost : '0.00',
                ]);
            }

            return $transfer->load(['fromWarehouse', 'toWarehouse', 'items.variant']);
        });
    }
}
