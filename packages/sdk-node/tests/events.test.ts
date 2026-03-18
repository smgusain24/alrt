import { describe, it, expect, vi, beforeEach } from "vitest";
import { Alrt } from "../src/client";

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe("EventsResource", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("trigger sends correct request", async () => {
    const fetch = mockFetch(202, {
      event_id: "abc-123",
      status: "accepted",
      warnings: [],
    });
    vi.stubGlobal("fetch", fetch);

    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    const result = await alrt.events.trigger({
      workflow: "order.completed",
      subscriberId: "user-1",
      payload: { orderId: "42" },
    });

    expect(result.eventId).toBe("abc-123");
    expect(result.status).toBe("accepted");

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/events/trigger");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer alrt_sk_test");
    const body = JSON.parse(options.body);
    expect(body.workflow).toBe("order.completed");
    expect(body.subscriber_id).toBe("user-1");
  });

  it("trigger sends idempotency key header", async () => {
    vi.stubGlobal("fetch", mockFetch(202, {
      event_id: "abc", status: "accepted", warnings: [],
    }));

    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    await alrt.events.trigger({
      workflow: "test",
      subscriberId: "u1",
      idempotencyKey: "my-key-123",
    });

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["Idempotency-Key"]).toBe("my-key-123");
  });

  it("triggerBulk sends correct request", async () => {
    vi.stubGlobal("fetch", mockFetch(200, {
      batch_id: "batch-1", status: "accepted", total: 2,
      accepted: 2, duplicates: 0, errors: 0,
      results: [
        { subscriber_id: "u1", event_id: "e1", status: "accepted" },
        { subscriber_id: "u2", event_id: "e2", status: "accepted" },
      ],
    }));

    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    const result = await alrt.events.triggerBulk({
      workflow: "promo",
      subscribers: [{ id: "u1" }, { id: "u2" }],
    });

    expect(result.total).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].subscriberId).toBe("u1");
  });
});
