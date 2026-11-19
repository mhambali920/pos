<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->restrictOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('code', 32);
            $table->string('name', 150);
            $table->string('slug', 160);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'code'], 'categories_org_code_unique');
            $table->unique(['organization_id', 'slug'], 'categories_org_slug_unique');
            $table->index(['organization_id', 'parent_id', 'is_active'], 'categories_org_parent_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
