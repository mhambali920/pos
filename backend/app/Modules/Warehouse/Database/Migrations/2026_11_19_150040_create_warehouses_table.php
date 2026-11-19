<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->string('code', 32);
            $table->string('name', 150);
            $table->text('address')->nullable();
            $table->boolean('is_default')->default(false);
            $table->string('status', 32)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'code'], 'warehouses_org_code_unique');
            $table->index(['organization_id', 'store_id', 'status'], 'warehouses_org_store_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
