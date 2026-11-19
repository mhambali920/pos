<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->unsignedBigInteger('user_id');
            $table->string('key', 100);
            $table->string('request_path', 255);
            $table->string('request_hash', 64);
            $table->unsignedSmallInteger('response_status');
            $table->longText('response_body');
            $table->timestamp('expires_at')->index();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['user_id', 'key', 'request_path'], 'idempotency_user_key_path_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
