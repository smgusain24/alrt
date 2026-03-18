import { describe, it, expect } from "vitest";
import {
  AlrtError,
  AlrtAuthError,
  AlrtValidationError,
  AlrtNotFoundError,
  AlrtConflictError,
  AlrtRateLimitError,
  AlrtApiError,
  throwForStatus,
} from "../src/errors";

describe("Error classes", () => {
  it("AlrtAuthError has correct status and code", () => {
    const err = new AlrtAuthError("bad key");
    expect(err.status).toBe(401);
    expect(err.code).toBe("auth_error");
    expect(err.message).toBe("bad key");
    expect(err).toBeInstanceOf(AlrtError);
  });

  it("AlrtRateLimitError includes retryAfter", () => {
    const err = new AlrtRateLimitError("slow down", 30);
    expect(err.status).toBe(429);
    expect(err.retryAfter).toBe(30);
  });

  it("AlrtConflictError has 409 status", () => {
    const err = new AlrtConflictError();
    expect(err.status).toBe(409);
    expect(err.code).toBe("conflict");
  });
});

describe("throwForStatus", () => {
  it("throws AlrtAuthError for 401", () => {
    expect(() => throwForStatus(401, '{"detail":"Invalid API key"}')).toThrow(AlrtAuthError);
  });

  it("throws AlrtNotFoundError for 404", () => {
    expect(() => throwForStatus(404, '{"detail":"Not found"}')).toThrow(AlrtNotFoundError);
  });

  it("throws AlrtConflictError for 409", () => {
    expect(() => throwForStatus(409, '{"detail":"Already exists"}')).toThrow(AlrtConflictError);
  });

  it("throws AlrtRateLimitError for 429 with retryAfter", () => {
    try {
      throwForStatus(429, '{"detail":"Rate limited"}', 60);
    } catch (e) {
      expect(e).toBeInstanceOf(AlrtRateLimitError);
      expect((e as AlrtRateLimitError).retryAfter).toBe(60);
    }
  });

  it("throws AlrtValidationError for 400", () => {
    expect(() => throwForStatus(400, '{"detail":"Bad request"}')).toThrow(AlrtValidationError);
  });

  it("throws AlrtApiError for 500", () => {
    expect(() => throwForStatus(500, "Internal error")).toThrow(AlrtApiError);
  });

  it("extracts detail from JSON body", () => {
    try {
      throwForStatus(401, '{"detail":"Custom message"}');
    } catch (e) {
      expect((e as AlrtError).message).toBe("Custom message");
    }
  });
});
