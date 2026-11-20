<?php

declare(strict_types=1);

namespace App\Modules\POS\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecordPosPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('pos.operate') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.payment_method_id' => ['required', 'integer', 'exists:payment_methods,id'],
            'payments.*.amount' => ['required', 'numeric', 'gt:0'],
            'payments.*.tendered_amount' => ['nullable', 'numeric', 'gt:0'],
            'payments.*.external_reference' => ['nullable', 'string', 'max:128'],
            'payments.*.metadata' => ['nullable', 'array'],
        ];
    }
}
