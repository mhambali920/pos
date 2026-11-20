<?php

declare(strict_types=1);

namespace App\Modules\Expense\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Expense\Actions\ApproveExpenseAction;
use App\Modules\Expense\Actions\CreateExpenseAction;
use App\Modules\Expense\Actions\RejectExpenseAction;
use App\Modules\Expense\Http\Requests\StoreExpenseRequest;
use App\Modules\Expense\Models\Expense;
use App\Modules\Expense\Models\ExpenseCategory;
use App\Modules\Store\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpenseController extends Controller
{
    public function categories(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('expenses.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $categories = ExpenseCategory::query()
            ->where('organization_id', $user->organization_id)
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        return ApiResponse::success($categories, 'Expense categories retrieved.');
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('expenses.create')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var array{code: string, name: string, description?: string|null} $validated */
        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('expense_categories', 'code')->where('organization_id', $user->organization_id),
            ],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $category = ExpenseCategory::query()->create([
            'organization_id' => $user->organization_id,
            'code' => Str::upper(trim($validated['code'])),
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        return ApiResponse::success($category, 'Expense category created.', 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('expenses.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        $query = Expense::query()
            ->with(['category', 'paymentMethod', 'creator', 'approver'])
            ->where('organization_id', $user->organization_id)
            ->where('store_id', $store->id);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        $paginator = $query->orderByDesc('expense_date')->orderByDesc('id')->paginate(20);

        return ApiResponse::success($paginator->items(), 'Expenses retrieved.', 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(StoreExpenseRequest $request, CreateExpenseAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        /** @var array{
         *     category_id: int,
         *     expense_date: string,
         *     amount: numeric-string,
         *     description: string,
         *     payment_method_id?: int|null,
         *     cash_register_session_id?: int|null
         * } $validated
         */
        $validated = $request->validated();

        $file = $request->file('attachment');
        $attachment = $file instanceof UploadedFile ? $file : null;

        $expense = $action->execute($store, $validated, $user->id, $attachment);

        return ApiResponse::success($expense, 'Expense created.', 201);
    }

    public function show(Request $request, Expense $expense): JsonResponse
    {
        $user = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        if (! $user instanceof User || ! $user->can('expenses.view') || $expense->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        return ApiResponse::success($expense->load(['category', 'paymentMethod', 'creator', 'approver']));
    }

    public function approve(Request $request, Expense $expense, ApproveExpenseAction $action): JsonResponse
    {
        $user = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        if (! $user instanceof User || ! $user->can('expenses.approve') || $expense->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $approved = $action->execute($expense, $user->id);

        return ApiResponse::success($approved, 'Expense approved.');
    }

    public function reject(Request $request, Expense $expense, RejectExpenseAction $action): JsonResponse
    {
        $user = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        if (! $user instanceof User || ! $user->can('expenses.approve') || $expense->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var array{reason: string} $validated */
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $rejected = $action->execute($expense, $validated['reason'], $user->id);

        return ApiResponse::success($rejected, 'Expense rejected.');
    }

    public function downloadAttachment(Request $request, Expense $expense): JsonResponse|StreamedResponse
    {
        $user = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        if (! $user instanceof User || ! $user->can('expenses.view') || $expense->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        if ($expense->attachment_path === null || ! Storage::disk('local')->exists($expense->attachment_path)) {
            return ApiResponse::error('Attachment not found.', 'NOT_FOUND', 404);
        }

        return Storage::disk('local')->download($expense->attachment_path);
    }
}
