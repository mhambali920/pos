<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('organization_id')
                ->nullable()
                ->after('id')
                ->constrained('organizations')
                ->nullOnDelete();
            $table->string('phone', 32)->nullable()->after('email');
            $table->boolean('is_active')->default(true)->after('password');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
            $table->softDeletes();

            $table->index(['organization_id', 'is_active'], 'users_org_active_idx');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex('users_org_active_idx');
            $table->dropConstrainedForeignId('organization_id');
            $table->dropColumn(['phone', 'is_active', 'last_login_at', 'deleted_at']);
        });
    }
};
