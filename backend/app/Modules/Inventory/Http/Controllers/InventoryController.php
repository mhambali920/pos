<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Inventory\Actions\FinalizeStockOpnameAction;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Http\Resources\InventoryStockResource;
use App\Modules\Inventory\Http\Resources\StockMovementResource;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\StockBatch;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Inventory\Models\StockOpname;
use App\Modules\Inventory\Models\StockOpnameItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $query = InventoryStock::query()
            ->with(['warehouse', 'variant', 'batch'])
            ->where('organization_id', $user->organization_id);

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->integer('warehouse_id'));
        }

        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->integer('product_variant_id'));
        }

        if ($request->boolean('low_stock_only')) {
            $query->whereHas('variant', function ($q): void {
                $q->whereColumn('inventory_stocks.qty_on_hand', '<=', 'product_variants.min_stock');
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);
        $paginator = $query->orderByDesc('updated_at')->orderByDesc('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, InventoryStockResource::collection($paginator));
    }

    public function movements(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $query = StockMovement::query()
            ->with(['warehouse', 'variant'])
            ->where('organization_id', $user->organization_id);

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->integer('warehouse_id'));
        }

        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->integer('product_variant_id'));
        }

        if ($request->filled('movement_type')) {
            $query->where('movement_type', (string) $request->string('movement_type'));
        }

        $perPage = min(max((int) $request->integer('per_page', 30), 1), 100);
        $paginator = $query->orderByDesc('created_at')->orderByDesc('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, StockMovementResource::collection($paginator));
    }

    public function reconcile(Request $request, InventoryLedgerContract $ledger): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view') || $user->organization_id === null) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $warehouseId = $request->filled('warehouse_id') ? $request->integer('warehouse_id') : null;
        $report = $ledger->reconcile($user->organization_id, $warehouseId);

        return ApiResponse::success($report, 'Inventory reconciliation completed.');
    }

    public function expiredAlerts(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $days = min(max((int) $request->integer('within_days', 30), 0), 365);
        $cutoff = now()->addDays($days)->toDateString();

        $batches = StockBatch::query()
            ->with('variant')
            ->where('organization_id', $user->organization_id)
            ->whereNotNull('expired_at')
            ->whereDate('expired_at', '<=', $cutoff)
            ->orderBy('expired_at')
            ->orderBy('id')
            ->limit(100)
            ->get();

        return ApiResponse::success(
            $batches->map(fn (StockBatch $b): array => [
                'id' => $b->id,
                'batch_number' => $b->batch_number,
                'expired_at' => $b->expired_at?->toDateString(),
                'is_expired' => $b->expired_at !== null && $b->expired_at->isPast(),
                'product_variant_id' => $b->product_variant_id,
                'sku' => $b->variant?->sku,
                'variant_name' => $b->variant?->name,
            ])->values()->all(),
        );
    }

    public function opnames(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $opnames = StockOpname::query()
            ->with(['warehouse', 'items.variant'])
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('id')
            ->paginate(20);

        return ApiResponse::success($opnames->items());
    }

    public function createOpname(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.opname') || $user->organization_id === null) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var array{warehouse_id: int, notes?: string|null, items: list<array{product_variant_id: int, batch_id?: int|null, counted_qty: numeric-string|int|float}>} $validated */
        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.batch_id' => ['nullable', 'integer', 'exists:stock_batches,id'],
            'items.*.counted_qty' => ['required', 'numeric', 'min:0'],
        ]);

        $opname = DB::transaction(function () use ($user, $validated): StockOpname {
            $record = StockOpname::query()->create([
                'organization_id' => $user->organization_id,
                'warehouse_id' => $validated['warehouse_id'],
                'opname_number' => 'OPN-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'status' => 'draft',
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($validated['items'] as $item) {
                StockOpnameItem::query()->create([
                    'stock_opname_id' => $record->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'batch_id' => $item['batch_id'] ?? null,
                    'counted_qty' => $item['counted_qty'],
                ]);
            }

            return $record->load(['warehouse', 'items.variant']);
        });

        return ApiResponse::success($opname, 'Stock opname draft created.', 201);
    }

    public function finalizeOpname(
        Request $request,
        StockOpname $opname,
        FinalizeStockOpnameAction $action,
    ): JsonResponse {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.approve') || $opname->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $finalized = $action->execute($opname, $user->id);

        return ApiResponse::success($finalized, 'Stock opname finalized.');
    }
}
