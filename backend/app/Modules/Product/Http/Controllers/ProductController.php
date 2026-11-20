<?php

declare(strict_types=1);

namespace App\Modules\Product\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Product\Actions\CreateProductAction;
use App\Modules\Product\Actions\UpdateProductAction;
use App\Modules\Product\Actions\UpsertStorePriceAction;
use App\Modules\Product\Http\Requests\StoreProductRequest;
use App\Modules\Product\Http\Requests\UpdateProductRequest;
use App\Modules\Product\Http\Requests\UpsertStorePriceRequest;
use App\Modules\Product\Http\Resources\ProductResource;
use App\Modules\Product\Http\Resources\ProductVariantResource;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductPriceHistory;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Product\Services\BarcodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Product::class);

        /** @var User $user */
        $user = $request->user();

        $query = Product::query()
            ->with([
                'category',
                'brand',
                'baseUnit',
                'tax',
                'supplier',
                'variants.barcodes',
                'variants.bundleComponents',
            ])
            ->where('organization_id', $user->organization_id);

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('variants', function ($vq) use ($search): void {
                        $vq->where('sku', 'like', "%{$search}%")
                            ->orWhereHas('barcodes', fn ($bq) => $bq->where('barcode', $search));
                    });
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('product_type')) {
            $query->where('product_type', (string) $request->string('product_type'));
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);
        $paginator = $query->orderByDesc('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, ProductResource::collection($paginator));
    }

    public function store(StoreProductRequest $request, CreateProductAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        /** @var array<string, mixed> $data */
        $data = $request->validated();
        $file = $request->file('image');
        if ($file instanceof UploadedFile) {
            $stored = $file->store("products/{$user->organization_id}", 'public');
            if (is_string($stored)) {
                $data['image_path'] = Storage::disk('public')->url($stored);
            }
        }

        $product = $action->execute($user->organization_id, $data);

        return ApiResponse::success(new ProductResource($product), 'Product created successfully.', 201);
    }

    public function show(Product $product): JsonResponse
    {
        Gate::authorize('view', $product);

        $product->load([
            'category',
            'brand',
            'baseUnit',
            'tax',
            'supplier',
            'variants.barcodes',
            'variants.bundleComponents',
        ]);

        return ApiResponse::success(new ProductResource($product));
    }

    public function update(UpdateProductRequest $request, Product $product, UpdateProductAction $action): JsonResponse
    {
        Gate::authorize('update', $product);

        /** @var User $user */
        $user = $request->user();

        /** @var array<string, mixed> $data */
        $data = $request->validated();
        $file = $request->file('image');
        if ($file instanceof UploadedFile) {
            $stored = $file->store("products/{$product->organization_id}", 'public');
            if (is_string($stored)) {
                $data['image_path'] = Storage::disk('public')->url($stored);
            }
        }

        $updated = $action->execute($product, $data, $user->id);

        return ApiResponse::success(new ProductResource($updated), 'Product updated successfully.');
    }

    public function destroy(Product $product, AuditLoggerContract $auditLogger): JsonResponse
    {
        Gate::authorize('delete', $product);

        $product->delete();

        $auditLogger->log(
            module: 'Product',
            action: 'product.deleted',
            entityType: Product::class,
            entityId: $product->id,
            organizationId: $product->organization_id,
        );

        return ApiResponse::success(null, 'Product archived successfully.');
    }

    public function lookupByBarcode(Request $request, string $code, BarcodeService $barcodeService): JsonResponse
    {
        Gate::authorize('viewAny', Product::class);

        /** @var User $user */
        $user = $request->user();
        if ($user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        $variant = $barcodeService->findVariantByBarcode($user->organization_id, $code);
        if (! $variant instanceof ProductVariant) {
            return ApiResponse::error('Product barcode not found.', 'BARCODE_NOT_FOUND', 404);
        }

        return ApiResponse::success([
            'variant' => (new ProductVariantResource($variant))->resolve($request),
            'product_name' => $variant->product?->name,
            'product_type' => $variant->product?->product_type->value,
        ]);
    }

    public function upsertStorePrice(
        UpsertStorePriceRequest $request,
        ProductVariant $variant,
        UpsertStorePriceAction $action,
    ): JsonResponse {
        $variant->load('product');
        if (! $variant->product instanceof Product) {
            return ApiResponse::error('Product not found.', 'NOT_FOUND', 404);
        }

        Gate::authorize('update', $variant->product);

        /** @var User $user */
        $user = $request->user();
        /** @var array<string, mixed> $validated */
        $validated = $request->validated();
        $storeId = is_int($validated['store_id']) ? $validated['store_id'] : (int) $validated['store_id'];

        $storePrice = $action->execute(
            organizationId: $variant->product->organization_id,
            variant: $variant,
            storeId: $storeId,
            data: $validated,
            actorId: $user->id,
        );

        return ApiResponse::success([
            'id' => $storePrice->id,
            'store_id' => $storePrice->store_id,
            'product_variant_id' => $storePrice->product_variant_id,
            'selling_price' => $storePrice->selling_price,
            'wholesale_price' => $storePrice->wholesale_price,
            'min_selling_price' => $storePrice->min_selling_price,
            'effective_from' => $storePrice->effective_from?->toIso8601String(),
            'effective_to' => $storePrice->effective_to?->toIso8601String(),
        ], 'Store price saved successfully.', 201);
    }

    public function priceHistory(Product $product): JsonResponse
    {
        Gate::authorize('view', $product);

        $variantIds = $product->variants()->pluck('id');
        $history = ProductPriceHistory::query()
            ->whereIn('product_variant_id', $variantIds)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return ApiResponse::success(
            $history->map(fn (ProductPriceHistory $h): array => [
                'id' => $h->id,
                'product_variant_id' => $h->product_variant_id,
                'store_id' => $h->store_id,
                'price_type' => $h->price_type,
                'old_price' => $h->old_price,
                'new_price' => $h->new_price,
                'reason' => $h->reason,
                'changed_by' => $h->changed_by,
                'created_at' => $h->created_at->toIso8601String(),
            ])->values()->all(),
        );
    }
}
