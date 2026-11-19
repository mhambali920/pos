<?php

declare(strict_types=1);

namespace App\Modules\IAM\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.view');
    }

    public function view(User $user, User $target): bool
    {
        return $user->can('users.view')
            && $target->organization_id === $user->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('users.create');
    }

    public function update(User $user, User $target): bool
    {
        return $user->can('users.update')
            && $target->organization_id === $user->organization_id;
    }

    public function delete(User $user, User $target): bool
    {
        return $user->can('users.delete')
            && $target->organization_id === $user->organization_id;
    }
}
