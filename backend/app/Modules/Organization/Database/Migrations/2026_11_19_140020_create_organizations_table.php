<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 150);
            $table->string('legal_name', 200)->nullable();
            $table->string('tax_id', 64)->nullable();
            $table->char('currency_code', 3)->default('IDR');
            $table->string('inventory_valuation_method', 16)->default('mac');
            $table->string('status', 32)->default('active')->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
