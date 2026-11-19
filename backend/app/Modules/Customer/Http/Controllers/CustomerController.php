<?php

declare(strict_types=1);

namespace App\Modules\Customer\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Customer\Http\Requests\StoreCustomerRequest;
use App\Modules\Customer\Http\Requests\UpdateCustomerRequest;
use App\Modules\Customer\Http\Resources\CustomerResource;
use App\Modules\Customer\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Customer::class);

        /** @var User $user */
        $user = $request->user();

        $query = Customer::query()
            ->with('group')
            ->where('organization_id', $user->organization_id);

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('customer_type')) {
            $query->where('customer_type', (string) $request->string('customer_type'));
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);
        $paginator = $query->orderBy('name')->orderBy('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, CustomerResource::collection($paginator));
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $customer = Customer::query()->create(array_merge($request->validated(), [
            'organization_id' => $user->organization_id,
        ]));

        return ApiResponse::success(
            new CustomerResource($customer->load('group')),
            'Customer created successfully.',
            201,
        );
    }

    public function show(Customer $customer): JsonResponse
    {
        Gate::authorize('view', $customer);

        return ApiResponse::success(new CustomerResource($customer->load('group')));
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        Gate::authorize('update', $customer);

        $customer->update($request->validated());

        return ApiResponse::success(
            new CustomerResource($customer->refresh()->load('group')),
            'Customer updated successfully.',
        );
    }

    public function destroy(Customer $customer): JsonResponse
    {
        Gate::authorize('delete', $customer);

        $customer->delete();

        return ApiResponse::success(null, 'Customer deleted successfully.');
    }
}
