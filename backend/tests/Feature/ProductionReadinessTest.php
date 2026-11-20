<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class ProductionReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_responds_ok(): void
    {
        $this->get('/up')->assertOk();
    }

    public function test_api_responses_include_security_and_request_id_headers(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response
            ->assertStatus(401)
            ->assertJsonPath('error_code', 'UNAUTHENTICATED')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('X-Request-Id');
    }

    public function test_scramble_openapi_spec_is_valid_and_documents_core_modules(): void
    {
        Gate::define('viewApiDocs', static fn (?User $user = null): bool => true);

        $response = $this->getJson('/docs/api.json');

        $response
            ->assertOk()
            ->assertJsonPath('info.version', '1.0.0');

        $this->assertStringStartsWith('3.1.', (string) $response->json('openapi'));

        /** @var array<string, mixed> $spec */
        $spec = $response->json();
        $paths = is_array($spec['paths'] ?? null) ? array_keys($spec['paths']) : [];

        $expectedPaths = [
            '/auth/login',
            '/products',
            '/inventory',
            '/purchasing/orders',
            '/pos/transactions',
            '/cash-register/open',
            '/expenses',
            '/promotions',
            '/dashboard/{role}',
            '/reports/{type}',
        ];

        foreach ($expectedPaths as $expected) {
            $this->assertContains($expected, $paths, "OpenAPI spec missing expected path: {$expected}");
        }
    }
}
