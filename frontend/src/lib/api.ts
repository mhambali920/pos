import { useAuthStore } from "@/stores/auth-store";
import type { ApiResponse } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  errorCode: string;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errorCode = "ERROR",
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.errors = errors;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  idempotencyKey?: string;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { token, activeStoreId } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (activeStoreId !== null) {
    headers.set("X-Store-Id", String(activeStoreId));
  }

  if (options.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.error_code ?? "HTTP_ERROR",
      payload?.errors
    );
  }

  return payload as ApiResponse<T>;
}
