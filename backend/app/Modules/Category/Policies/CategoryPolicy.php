<?php

declare(strict_types=1);

namespace App\Modules\Category\Policies;

use App\Models\User;
use App\Modules\Category\Models\Category;

class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('products.view');
    }

    public function view(User $user, Category $category): bool
    {
        return $user->can('products.view') && $category->organization_id === $user->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('products.create');
    }

    public function update(User $user, Category $category): bool
    {
        return $user->can('products.update') && $category->organization_id === $user->organization_id;
    }

    public function delete(User $user, Category $category): bool
    {
        return $user->can('products.delete') && $category->organization_id === $user->organization_id;
    }
}
