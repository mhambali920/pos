<?php

declare(strict_types=1);

namespace App\Modules\FinancialReporting\Jobs;

use App\Models\User;
use App\Modules\FinancialReporting\Models\ReportExport;
use App\Modules\FinancialReporting\Services\ReportingService;
use App\Modules\Notification\Services\NotificationDispatcherService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class GenerateReportExportJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly int $reportExportId,
    ) {}

    public function handle(ReportingService $reporting, NotificationDispatcherService $notifications): void
    {
        $export = ReportExport::query()->with('user')->find($this->reportExportId);
        if (! $export instanceof ReportExport || ! $export->user instanceof User) {
            return;
        }

        try {
            /** @var array{date_from?: string|null, date_to?: string|null, store_id?: int|null} $filters */
            $filters = is_array($export->filters) ? $export->filters : [];
            $report = $reporting->generate($export->user, $export->report_type, $filters);

            /** @var list<array<string, mixed>> $rows */
            $rows = is_array($report['rows'] ?? null) ? $report['rows'] : [];

            $extension = match ($export->format) {
                'excel' => 'xls',
                'pdf' => 'html',
                default => 'csv',
            };

            $content = match ($export->format) {
                'pdf' => $this->renderHtml($export->report_type, $rows),
                default => $this->renderCsv($rows),
            };

            $path = "exports/{$export->organization_id}/{$export->report_type}-".Str::uuid()->toString().".{$extension}";
            Storage::disk('local')->put($path, $content);

            $export->update([
                'status' => 'completed',
                'file_path' => $path,
                'completed_at' => now(),
            ]);

            $notifications->send(
                recipient: $export->user,
                type: 'report_export_ready',
                title: 'Report Export Ready',
                body: strtoupper($export->report_type).' report ('.strtoupper($export->format).') is ready for download.',
                data: ['export_id' => $export->id, 'report_type' => $export->report_type],
                storeId: $export->store_id,
            );
        } catch (Throwable $e) {
            $export->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function renderCsv(array $rows): string
    {
        if ($rows === []) {
            return "No data\n";
        }

        $handle = fopen('php://temp', 'r+');
        if ($handle === false) {
            return '';
        }

        fputcsv($handle, array_keys($rows[0]));
        foreach ($rows as $row) {
            fputcsv($handle, array_map(static fn ($v): string => is_scalar($v) ? (string) $v : '', $row));
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return is_string($csv) ? $csv : '';
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function renderHtml(string $type, array $rows): string
    {
        $title = e(strtoupper($type).' REPORT');
        $headers = $rows !== [] ? array_keys($rows[0]) : [];
        $headHtml = implode('', array_map(static fn (string $h): string => '<th>'.e($h).'</th>', $headers));
        $bodyHtml = '';

        foreach ($rows as $row) {
            $cells = implode('', array_map(
                static fn ($v): string => '<td>'.e(is_scalar($v) ? (string) $v : '').'</td>',
                $row,
            ));
            $bodyHtml .= "<tr>{$cells}</tr>";
        }

        return "<!doctype html><html><head><meta charset=\"utf-8\"><title>{$title}</title></head>"
            ."<body><h1>{$title}</h1><table border=\"1\" cellpadding=\"6\" cellspacing=\"0\"><thead><tr>{$headHtml}</tr></thead><tbody>{$bodyHtml}</tbody></table></body></html>";
    }
}
