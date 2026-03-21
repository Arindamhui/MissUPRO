export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed", details?: unknown) {
    super(401, "AUTHENTICATION_FAILED", message, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Forbidden", details?: unknown) {
    super(403, "FORBIDDEN", message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(422, "VALIDATION_FAILED", message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(409, "CONFLICT", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", details?: unknown) {
    super(404, "NOT_FOUND", message, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded", details?: unknown) {
    super(429, "RATE_LIMITED", message, details);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}