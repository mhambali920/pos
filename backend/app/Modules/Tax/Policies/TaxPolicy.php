<?php

declare(strict_types=1);

namespace App\Modules\Tax\Policies;

use App\Models\User;
use App\Modules\Tax\Models\Tax;

class TaxPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('products.view') || $user->can('settings.view');
    }

    public function view(User $user, Tax $tax): bool
    {
        return ($user->can('products.view') || $user->can('settings.view'))
            && $tax->organization_id === $user->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('settings.update');
    }

    public function update(User $user, Tax $tax): bool
    {
        return $user->can('settings.update') && $tax->organization_id === $user->organization_id;
    }

    public function delete(User $user, Tax $tax): bool
    {
        return $user->can('settings.update') && $tax->organization_id === $user->organization_id;
    }
}
