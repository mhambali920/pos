<?php

declare(strict_types=1);

namespace App\Modules\Organization\Policies;

use App\Models\User;
use App\Modules\Organization\Models\Organization;

class OrganizationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('organizations.view');
    }

    public function view(User $user, Organization $organization): bool
    {
        return $user->can('organizations.view')
            && ($user->hasRole('Super Admin') || $organization->id === $user->organization_id);
    }

    public function create(User $user): bool
    {
        return $user->can('organizations.create');
    }

    public function update(User $user, Organization $organization): bool
    {
        return $user->can('organizations.update')
            && ($user->hasRole('Super Admin') || $organization->id === $user->organization_id);
    }
}
