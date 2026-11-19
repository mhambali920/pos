<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_batches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->string('batch_number', 64);
            $table->date('manufactured_at')->nullable();
            $table->date('expired_at')->nullable()->index();
            $table->timestamps();

            $table->unique(['organization_id', 'product_variant_id', 'batch_number'], 'stock_batches_unique');
        });

        Schema::create('inventory_stocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('stock_batches')->restrictOnDelete();
            $table->decimal('qty_on_hand', 15, 4)->default(0);
            $table->decimal('qty_reserved', 15, 4)->default(0);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['warehouse_id', 'product_variant_id', 'batch_id'], 'inv_stocks_wh_var_batch_unique');
            $table->index(['organization_id', 'warehouse_id', 'product_variant_id'], 'inv_stocks_org_wh_var_idx');
        });

        Schema::create('stock_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('stock_batches')->restrictOnDelete();
            $table->string('movement_type', 32);
            $table->decimal('qty_before', 15, 4);
            $table->decimal('qty_change', 15, 4);
            $table->decimal('qty_after', 15, 4);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->string('reference_type', 100);
            $table->unsignedBigInteger('reference_id');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['warehouse_id', 'product_variant_id', 'created_at'], 'stock_mov_wh_var_created_idx');
            $table->index(['reference_type', 'reference_id'], 'stock_mov_reference_idx');
            $table->index(['organization_id', 'movement_type', 'created_at'], 'stock_mov_org_type_created_idx');
        });

        Schema::create('stock_opnames', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->string('opname_number', 64);
            $table->string('status', 24)->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('finalized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'opname_number'], 'stock_opnames_org_num_unique');
        });

        Schema::create('stock_opname_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('stock_opname_id')->constrained('stock_opnames')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('stock_batches')->restrictOnDelete();
            $table->decimal('system_qty', 15, 4)->default(0);
            $table->decimal('counted_qty', 15, 4);
            $table->decimal('variance_qty', 15, 4)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_opname_items');
        Schema::dropIfExists('stock_opnames');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('inventory_stocks');
        Schema::dropIfExists('stock_batches');
    }
};
