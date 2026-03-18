import { describe, it, expect } from "vitest";
import { isRetryable, getRetryDelay } from "../src/retry";

describe("isRetryable", () => {
  it("returns true for 429", () => expect(isRetryable(429)).toBe(true));
  it("returns true for 500", () => expect(isRetryable(500)).toBe(true));
  it("returns true for 502", () => expect(isRetryable(502)).toBe(true));
  it("returns false for 400", () => expect(isRetryable(400)).toBe(false));
  it("returns false for 401", () => expect(isRetryable(401)).toBe(false));
  it("returns false for 404", () => expect(isRetryable(404)).toBe(false));
  it("returns false for 200", () => expect(isRetryable(200)).toBe(false));
});

describe("getRetryDelay", () => {
  it("respects Retry-After header", () => {
    const delay = getRetryDelay(0, "30");
    expect(delay).toBe(30000);
  });

  it("uses exponential backoff without header", () => {
    const delay = getRetryDelay(0, null);
    expect(delay).toBeGreaterThanOrEqual(500);
    expect(delay).toBeLessThan(700); // 500 + up to 100 jitter
  });

  it("increases delay with attempt number", () => {
    const d0 = getRetryDelay(0, null);
    const d1 = getRetryDelay(1, null);
    const d2 = getRetryDelay(2, null);
    expect(d1).toBeGreaterThan(d0);
    expect(d2).toBeGreaterThan(d1);
  });
});
