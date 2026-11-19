<?php

declare(strict_types=1);

namespace App\Modules\StockAdjustment\Actions;

use App\Modules\StockAdjustment\Models\StockAdjustment;
use App\Modules\StockAdjustment\Models\StockAdjustmentItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreateStockAdjustmentAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(int $organizationId, int $actorId, array $data): StockAdjustment
    {
        return DB::transaction(function () use ($organizationId, $actorId, $data): StockAdjustment {
            $adjustment = StockAdjustment::query()->create([
                'organization_id' => $organizationId,
                'warehouse_id' => $data['warehouse_id'],
                'adjustment_number' => 'ADJ-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'reason' => $data['reason'],
                'status' => 'draft',
                'created_by' => $actorId,
            ]);

            /** @var list<array<string, mixed>> $items */
            $items = is_array($data['items'] ?? null) ? $data['items'] : [];
            foreach ($items as $item) {
                StockAdjustmentItem::query()->create([
                    'stock_adjustment_id' => $adjustment->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'batch_id' => $item['batch_id'] ?? null,
                    'direction' => $item['direction'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            return $adjustment->load(['warehouse', 'items.variant']);
        });
    }
}
