<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('store_id')->constrained('stores')->restrictOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->unsignedBigInteger('cash_register_session_id')->nullable()->index();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('cashier_id')->constrained('users')->restrictOnDelete();
            $table->string('transaction_number', 64);
            $table->string('status', 32)->default('pending_payment');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->decimal('rounding_amount', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->decimal('paid_total', 15, 2)->default(0);
            $table->decimal('change_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cancellation_reason', 255)->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'transaction_number'], 'sales_org_trx_num_unique');
            $table->index(['store_id', 'status', 'completed_at'], 'sales_store_status_completed_idx');
            $table->index(['organization_id', 'created_at'], 'sales_org_created_idx');
        });

        Schema::create('sale_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->string('sku_snapshot', 64);
            $table->string('barcode_snapshot', 100)->nullable();
            $table->string('product_name_snapshot', 200);
            $table->string('unit_name_snapshot', 64)->nullable();
            $table->decimal('quantity', 15, 4);
            $table->decimal('unit_price_snapshot', 15, 2);
            $table->decimal('cost_price_snapshot', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_rate_snapshot', 7, 4)->default(0);
            $table->string('tax_type_snapshot', 16)->default('exclusive');
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2);
            $table->timestamps();

            $table->index('sale_id', 'sale_items_sale_idx');
            $table->index('product_variant_id', 'sale_items_variant_idx');
        });

        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('store_id')->constrained('stores')->restrictOnDelete();
            $table->foreignId('sale_id')->constrained('sales')->restrictOnDelete();
            $table->foreignId('payment_method_id')->constrained('payment_methods')->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->decimal('tendered_amount', 15, 2)->default(0);
            $table->decimal('change_amount', 15, 2)->default(0);
            $table->string('status', 24)->default('confirmed');
            $table->string('external_reference', 128)->nullable()->unique();
            $table->json('gateway_payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['sale_id', 'status'], 'payments_sale_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};
