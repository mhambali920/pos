<?php

declare(strict_types=1);

namespace App\Modules\Notification\Services;

use App\Models\User;
use App\Modules\Notification\Models\AppNotification;
use Illuminate\Support\Facades\Mail;

final class NotificationDispatcherService
{
    /**
     * @param  array<string, mixed>|null  $data
     */
    public function send(
        User $recipient,
        string $type,
        string $title,
        string $body,
        ?array $data = null,
        ?int $storeId = null,
        bool $sendEmail = false,
    ): AppNotification {
        $notification = AppNotification::query()->create([
            'organization_id' => $recipient->organization_id,
            'store_id' => $storeId,
            'user_id' => $recipient->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'channel' => $sendEmail ? 'database+email' : 'database',
            'created_at' => now(),
        ]);

        if ($sendEmail && $recipient->email !== '') {
            Mail::raw($body, static function ($message) use ($recipient, $title): void {
                $message->to($recipient->email)->subject($title);
            });
        }

        return $notification;
    }
}
