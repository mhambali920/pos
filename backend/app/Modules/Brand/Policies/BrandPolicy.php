<?php

declare(strict_types=1);

namespace App\Modules\Brand\Policies;

use App\Models\User;
use App\Modules\Brand\Models\Brand;

class BrandPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('products.view');
    }

    public function view(User $user, Brand $brand): bool
    {
        return $user->can('products.view') && $brand->organization_id === $user->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('products.create');
    }

    public function update(User $user, Brand $brand): bool
    {
        return $user->can('products.update') && $brand->organization_id === $user->organization_id;
    }

    public function delete(User $user, Brand $brand): bool
    {
        return $user->can('products.delete') && $brand->organization_id === $user->organization_id;
    }
}
