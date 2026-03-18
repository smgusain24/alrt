import { describe, it, expect, vi, beforeEach } from "vitest";
import { Alrt } from "../src/client";
import { AlrtRateLimitError } from "../src/errors";

describe("Client retry behavior", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("retries on 429 then succeeds", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          ok: false, status: 429,
          headers: new Headers({ "retry-after": "0" }),
          text: () => Promise.resolve('{"detail":"Rate limited"}'),
        });
      }
      return Promise.resolve({
        ok: true, status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({
          event_id: "ok", status: "accepted", warnings: [],
        }),
      });
    }));

    const alrt = new Alrt({ apiKey: "alrt_sk_test", maxRetries: 3 });
    const result = await alrt.events.trigger({ workflow: "test", subscriberId: "u1" });
    expect(result.status).toBe("accepted");
    expect(callCount).toBe(3);
  });

  it("throws after max retries exhausted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 500,
      headers: new Headers(),
      text: () => Promise.resolve("Server error"),
    }));

    const alrt = new Alrt({ apiKey: "alrt_sk_test", maxRetries: 1 });
    await expect(
      alrt.events.trigger({ workflow: "test", subscriberId: "u1" })
    ).rejects.toThrow();
  });

  it("does not retry on 400", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false, status: 400,
      headers: new Headers(),
      text: () => Promise.resolve('{"detail":"Bad request"}'),
    });
    vi.stubGlobal("fetch", fetch);

    const alrt = new Alrt({ apiKey: "alrt_sk_test", maxRetries: 3 });
    await expect(
      alrt.events.trigger({ workflow: "test", subscriberId: "u1" })
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("requires apiKey", () => {
    expect(() => new Alrt({ apiKey: "" })).toThrow("apiKey is required");
  });
});
