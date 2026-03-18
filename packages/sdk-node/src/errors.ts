export class AlrtError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AlrtError";
    this.status = status;
    this.code = code;
  }
}

export class AlrtAuthError extends AlrtError {
  constructor(message = "Invalid or missing API key") {
    super(message, 401, "auth_error");
    this.name = "AlrtAuthError";
  }
}

export class AlrtValidationError extends AlrtError {
  constructor(message = "Invalid request") {
    super(message, 400, "validation_error");
    this.name = "AlrtValidationError";
  }
}

export class AlrtNotFoundError extends AlrtError {
  constructor(message = "Resource not found") {
    super(message, 404, "not_found");
    this.name = "AlrtNotFoundError";
  }
}

export class AlrtConflictError extends AlrtError {
  constructor(message = "Resource already exists") {
    super(message, 409, "conflict");
    this.name = "AlrtConflictError";
  }
}

export class AlrtRateLimitError extends AlrtError {
  public readonly retryAfter: number | null;

  constructor(message = "Rate limit exceeded", retryAfter: number | null = null) {
    super(message, 429, "rate_limit");
    this.name = "AlrtRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class AlrtApiError extends AlrtError {
  constructor(message = "Internal server error", status = 500) {
    super(message, status, "api_error");
    this.name = "AlrtApiError";
  }
}

export function throwForStatus(status: number, body: string, retryAfter: number | null = null): never {
  const detail = extractDetail(body);
  if (status === 401) throw new AlrtAuthError(detail);
  if (status === 404) throw new AlrtNotFoundError(detail);
  if (status === 409) throw new AlrtConflictError(detail);
  if (status === 429) throw new AlrtRateLimitError(detail, retryAfter);
  if (status === 400 || status === 422) throw new AlrtValidationError(detail);
  throw new AlrtApiError(detail, status);
}

function extractDetail(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed.detail || parsed.message || body;
  } catch {
    return body;
  }
}
