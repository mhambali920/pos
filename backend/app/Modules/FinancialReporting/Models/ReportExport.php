<?php

declare(strict_types=1);

namespace App\Modules\FinancialReporting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $store_id
 * @property int $user_id
 * @property string $report_type
 * @property string $format
 * @property array<string, mixed>|null $filters
 * @property string $status
 * @property string|null $file_path
 * @property string|null $error_message
 * @property Carbon|null $completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ReportExport extends Model
{
    protected $table = 'report_exports';

    protected $fillable = [
        'organization_id',
        'store_id',
        'user_id',
        'report_type',
        'format',
        'filters',
        'status',
        'file_path',
        'error_message',
        'completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
