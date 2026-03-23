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
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      body: {
        ok: false,
        error: { code: error.code, message: error.message, details: error.details },
        requestId,
      },
    };
  }

  // Zod validation errors
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as any).issues)) {
    return {
      statusCode: 422,
      body: {
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Validation failed",
          details: (error as any).issues,
        },
        requestId,
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" },
      requestId,
    },
  };
}