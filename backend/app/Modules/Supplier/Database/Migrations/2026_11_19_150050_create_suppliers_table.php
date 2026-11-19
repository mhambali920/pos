<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->string('code', 32);
            $table->string('company_name', 180);
            $table->string('contact_person', 120)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('address')->nullable();
            $table->string('tax_id', 64)->nullable();
            $table->unsignedSmallInteger('payment_terms_days')->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'code'], 'suppliers_org_code_unique');
            $table->index(['organization_id', 'is_active'], 'suppliers_org_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
