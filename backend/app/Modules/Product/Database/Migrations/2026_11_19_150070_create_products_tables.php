<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->foreignId('base_unit_id')->constrained('units')->restrictOnDelete();
            $table->foreignId('tax_id')->nullable()->constrained('taxes')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('product_type', 24)->default('standard');
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->string('image_path', 500)->nullable();
            $table->boolean('track_inventory')->default(true);
            $table->boolean('track_batch')->default(false);
            $table->boolean('track_serial')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'category_id', 'is_active'], 'products_org_cat_active_idx');
            $table->index(['organization_id', 'product_type', 'is_active'], 'products_org_type_active_idx');
        });

        Schema::create('product_variants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku', 64)->unique();
            $table->string('name', 200);
            $table->json('attributes')->nullable();
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->decimal('wholesale_price', 15, 2)->nullable();
            $table->decimal('min_selling_price', 15, 2)->default(0);
            $table->decimal('average_cost', 15, 2)->default(0);
            $table->decimal('min_stock', 15, 4)->default(0);
            $table->decimal('max_stock', 15, 4)->nullable();
            $table->decimal('reorder_point', 15, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['product_id', 'is_active'], 'product_variants_product_active_idx');
        });

        Schema::create('product_barcodes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->string('barcode', 100);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['organization_id', 'barcode'], 'product_barcodes_org_barcode_unique');
        });

        Schema::create('product_bundles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bundle_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('component_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->decimal('quantity', 15, 4);
            $table->timestamps();

            $table->unique(['bundle_variant_id', 'component_variant_id'], 'product_bundles_unique');
        });

        Schema::create('product_store_prices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->decimal('selling_price', 15, 2);
            $table->decimal('wholesale_price', 15, 2)->nullable();
            $table->decimal('min_selling_price', 15, 2)->nullable();
            $table->timestamp('effective_from')->nullable();
            $table->timestamp('effective_to')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'product_variant_id', 'effective_from', 'effective_to'], 'psp_lookup_idx');
        });

        Schema::create('product_price_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->string('price_type', 32);
            $table->decimal('old_price', 15, 2)->nullable();
            $table->decimal('new_price', 15, 2);
            $table->string('reason', 255)->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['product_variant_id', 'created_at'], 'pph_variant_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_price_histories');
        Schema::dropIfExists('product_store_prices');
        Schema::dropIfExists('product_bundles');
        Schema::dropIfExists('product_barcodes');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
    }
};
