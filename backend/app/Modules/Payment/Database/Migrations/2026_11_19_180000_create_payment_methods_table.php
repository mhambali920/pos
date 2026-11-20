<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->string('code', 32);
            $table->string('name', 100);
            $table->string('type', 24); // cash | debit | credit | transfer | qris | ewallet | store_credit | customer_credit
            $table->string('gateway_driver', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'code'], 'payment_methods_org_code_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
