<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->string('code', 32);
            $table->string('name', 150);
            $table->text('address')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('timezone', 64)->default('Asia/Jakarta');
            $table->json('operating_hours')->nullable();
            $table->unsignedBigInteger('default_tax_id')->nullable();
            $table->boolean('allow_negative_stock')->default(false);
            $table->json('cashier_config')->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'code'], 'stores_org_code_unique');
            $table->index(['organization_id', 'status'], 'stores_org_status_idx');
        });

        Schema::create('user_store_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->unsignedBigInteger('warehouse_id')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'store_id'], 'user_store_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_store_assignments');
        Schema::dropIfExists('stores');
    }
};
