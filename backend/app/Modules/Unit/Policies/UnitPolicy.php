<?php

declare(strict_types=1);

namespace App\Modules\Unit\Policies;

use App\Models\User;
use App\Modules\Unit\Models\Unit;

class UnitPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('products.view');
    }

    public function view(User $user, Unit $unit): bool
    {
        return $user->can('products.view') && $unit->organization_id === $user->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('products.create');
    }

    public function update(User $user, Unit $unit): bool
    {
        return $user->can('products.update') && $unit->organization_id === $user->organization_id;
    }

    public function delete(User $user, Unit $unit): bool
    {
        return $user->can('products.delete') && $unit->organization_id === $user->organization_id;
    }
}
