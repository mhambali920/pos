<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());

        RateLimiter::for('login', function (Request $request): Limit {
            $key = Str::transliterate(
                Str::lower($request->string('email')->toString()).'|'.$request->ip()
            );

            return Limit::perMinute(5)->by($key);
        });

        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute(120)->by(
                (string) ($request->user()?->getAuthIdentifier() ?? $request->ip())
            );
        });

        RateLimiter::for('exports', function (Request $request): Limit {
            return Limit::perMinute(10)->by(
                (string) ($request->user()?->getAuthIdentifier() ?? $request->ip())
            );
        });
    }
}
