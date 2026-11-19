<?php

declare(strict_types=1);

namespace App\Modules\Warehouse\Policies;

use App\Models\User;
use App\Modules\Warehouse\Models\Warehouse;

class WarehousePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('warehouses.view');
    }

    public function view(User $user, Warehouse $warehouse): bool
    {
        if (! $user->can('warehouses.view') || $warehouse->organization_id !== $user->organization_id) {
            return false;
        }

        if ($warehouse->store_id !== null && ! $user->canAccessStore($warehouse->store_id)) {
            return false;
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->can('warehouses.create');
    }

    public function update(User $user, Warehouse $warehouse): bool
    {
        return $user->can('warehouses.update') && $warehouse->organization_id === $user->organization_id;
    }

    public function delete(User $user, Warehouse $warehouse): bool
    {
        return $user->can('warehouses.delete') && $warehouse->organization_id === $user->organization_id;
    }
}
