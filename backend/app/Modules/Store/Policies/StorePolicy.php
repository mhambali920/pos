<?php

declare(strict_types=1);

namespace App\Modules\Store\Policies;

use App\Models\User;
use App\Modules\Store\Models\Store;

class StorePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('stores.view');
    }

    public function view(User $user, Store $store): bool
    {
        return $user->can('stores.view')
            && $store->organization_id === $user->organization_id
            && $user->canAccessStore($store->id);
    }

    public function create(User $user): bool
    {
        return $user->can('stores.create');
    }

    public function update(User $user, Store $store): bool
    {
        return $user->can('stores.update')
            && $store->organization_id === $user->organization_id
            && $user->canAccessStore($store->id);
    }

    public function delete(User $user, Store $store): bool
    {
        return $user->can('stores.delete')
            && $store->organization_id === $user->organization_id;
    }
}
