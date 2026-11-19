<?php

declare(strict_types=1);

namespace App\Modules\Product\Policies;

use App\Models\User;
use App\Modules\Product\Models\Product;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('products.view');
    }

    public function view(User $user, Product $product): bool
    {
        return $user->can('products.view') && $product->organization_id === $user->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('products.create');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->can('products.update') && $product->organization_id === $user->organization_id;
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->can('products.delete') && $product->organization_id === $user->organization_id;
    }
}
