<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_groups', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->string('code', 32);
            $table->string('name', 120);
            $table->decimal('discount_rate', 7, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'code'], 'customer_groups_org_code_unique');
        });

        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('customer_group_id')->nullable()->constrained('customer_groups')->nullOnDelete();
            $table->string('code', 32);
            $table->string('name', 150);
            $table->string('phone', 32)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('address')->nullable();
            $table->string('customer_type', 24)->default('registered');
            $table->bigInteger('loyalty_points')->default(0);
            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'code'], 'customers_org_code_unique');
            $table->index(['organization_id', 'phone'], 'customers_org_phone_idx');
            $table->index(['organization_id', 'customer_type', 'is_active'], 'customers_org_type_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
        Schema::dropIfExists('customer_groups');
    }
};
