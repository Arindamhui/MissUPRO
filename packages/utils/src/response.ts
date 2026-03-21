import { AppError, isAppError } from "./errors";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId?: string;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export function successResponse<T>(data: T, requestId?: string): ApiSuccess<T> {
  return { ok: true, data, requestId };
}

export function errorResponse(error: unknown, requestId?: string): { statusCode: number; body: ApiFailure } {
  const appError = isAppError(error)
    ? error
    : new AppError(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");

  return {
    statusCode: appError.statusCode,
    body: {
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
      requestId,
    },
  };
}