<?php

declare(strict_types=1);

namespace App\Modules\FinancialReporting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\FinancialReporting\Jobs\GenerateReportExportJob;
use App\Modules\FinancialReporting\Models\ReportExport;
use App\Modules\FinancialReporting\Services\ReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * @var list<string>
     */
    private const array REPORT_TYPES = ['sales', 'inventory', 'purchasing', 'financial'];

    public function show(Request $request, string $type, ReportingService $reporting): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        if (! in_array($type, self::REPORT_TYPES, true)) {
            return ApiResponse::error('Invalid report type.', 'INVALID_REPORT_TYPE', 422);
        }

        $requiredPerm = $type === 'financial' ? 'reports.financial' : 'reports.view';
        if (! $user->can($requiredPerm)) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $storeId = $request->filled('store_id')
            ? $request->integer('store_id')
            : ($request->header('X-Store-Id') !== null ? (int) $request->header('X-Store-Id') : null);

        $data = $reporting->generate($user, $type, [
            'date_from' => $request->filled('date_from') ? (string) $request->string('date_from') : null,
            'date_to' => $request->filled('date_to') ? (string) $request->string('date_to') : null,
            'store_id' => $storeId,
        ]);

        return ApiResponse::success($data, 'Report generated.');
    }

    public function export(Request $request, string $type): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('reports.export')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        if (! in_array($type, self::REPORT_TYPES, true)) {
            return ApiResponse::error('Invalid report type.', 'INVALID_REPORT_TYPE', 422);
        }

        if ($type === 'financial' && ! $user->can('reports.financial')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var array{format: string, date_from?: string|null, date_to?: string|null, store_id?: int|null} $validated */
        $validated = $request->validate([
            'format' => ['required', Rule::in(['csv', 'excel', 'pdf'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'store_id' => ['nullable', 'integer'],
        ]);

        $storeId = $validated['store_id']
            ?? ($request->header('X-Store-Id') !== null ? (int) $request->header('X-Store-Id') : null);

        $export = ReportExport::query()->create([
            'organization_id' => $user->organization_id,
            'store_id' => $storeId,
            'user_id' => $user->id,
            'report_type' => $type,
            'format' => $validated['format'],
            'filters' => [
                'date_from' => $validated['date_from'] ?? null,
                'date_to' => $validated['date_to'] ?? null,
                'store_id' => $storeId,
            ],
            'status' => 'queued',
        ]);

        GenerateReportExportJob::dispatch($export->id);

        return ApiResponse::success($export->refresh(), 'Report export queued.', 202);
    }

    public function exports(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('reports.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $exports = ReportExport::query()
            ->where('organization_id', $user->organization_id)
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        return ApiResponse::success($exports, 'Report exports retrieved.');
    }

    public function download(Request $request, ReportExport $export): JsonResponse|StreamedResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $export->user_id !== $user->id || $export->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        if ($export->file_path === null || ! Storage::disk('local')->exists($export->file_path)) {
            return ApiResponse::error('Export file not ready or not found.', 'NOT_FOUND', 404);
        }

        return Storage::disk('local')->download($export->file_path);
    }
}
