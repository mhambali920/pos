<?php

declare(strict_types=1);

namespace App\Modules\Supplier\Policies;

use App\Models\User;
use App\Modules\Supplier\Models\Supplier;

class SupplierPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('suppliers.view');
    }

    public function view(User $user, Supplier $supplier): bool
    {
        return $user->can('suppliers.view') && $supplier->organization_id === $user->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('suppliers.create');
    }

    public function update(User $user, Supplier $supplier): bool
    {
        return $user->can('suppliers.update') && $supplier->organization_id === $user->organization_id;
    }

    public function delete(User $user, Supplier $supplier): bool
    {
        return $user->can('suppliers.delete') && $supplier->organization_id === $user->organization_id;
    }
}
