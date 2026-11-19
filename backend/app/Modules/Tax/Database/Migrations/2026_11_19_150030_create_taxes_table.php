<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('taxes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->string('code', 32);
            $table->string('name', 100);
            $table->decimal('rate', 7, 4);
            $table->string('type', 16)->default('exclusive');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'code'], 'taxes_org_code_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taxes');
    }
};
