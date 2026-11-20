<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_returns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->restrictOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignId('sale_id')->constrained('sales')->restrictOnDelete();
            $table->foreignId('cash_register_session_id')->nullable()->constrained('cash_register_sessions')->nullOnDelete();
            $table->string('return_number', 64);
            $table->string('type', 32)->default('refund');
            $table->string('reason', 255);
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->foreignId('refund_method_id')->nullable()->constrained('payment_methods')->nullOnDelete();
            $table->foreignId('exchange_sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->string('status', 32)->default('completed');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['organization_id', 'return_number']);
            $table->index('sale_id');
            $table->index(['store_id', 'created_at']);
        });

        Schema::create('sale_return_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sale_return_id')->constrained('sale_returns')->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained('sale_items')->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->decimal('quantity', 15, 4);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('refund_subtotal', 15, 2);
            $table->string('condition', 32)->default('resellable');
            $table->timestamps();

            $table->index('sale_return_id');
            $table->index('sale_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_items');
        Schema::dropIfExists('sale_returns');
    }
};
