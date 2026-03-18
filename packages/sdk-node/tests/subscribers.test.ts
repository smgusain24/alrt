import { describe, it, expect, vi, beforeEach } from "vitest";
import { Alrt } from "../src/client";
import { AlrtConflictError, AlrtNotFoundError } from "../src/errors";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

const SUBSCRIBER_RESPONSE = {
  id: "uuid-1",
  external_id: "user-1",
  email: "a@b.com",
  name: "Alice",
  phone_number: null,
  slack_user_id: null,
  discord_webhook_url: null,
  telegram_chat_id: null,
  push_tokens: [],
  custom_properties: {},
  channel_preferences: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("SubscribersResource", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("create sends POST and returns subscriber", async () => {
    vi.stubGlobal("fetch", mockFetch(201, SUBSCRIBER_RESPONSE));
    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    const sub = await alrt.subscribers.create({ externalId: "user-1", email: "a@b.com" });
    expect(sub.externalId).toBe("user-1");
    expect(sub.email).toBe("a@b.com");
  });

  it("create throws AlrtConflictError on 409", async () => {
    vi.stubGlobal("fetch", mockFetch(409, { detail: "Subscriber already exists" }));
    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    await expect(alrt.subscribers.create({ externalId: "user-1" })).rejects.toThrow(AlrtConflictError);
  });

  it("get sends GET with subscriber ID", async () => {
    const fetch = mockFetch(200, SUBSCRIBER_RESPONSE);
    vi.stubGlobal("fetch", fetch);
    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    await alrt.subscribers.get("user-1");
    expect(fetch.mock.calls[0][0]).toContain("/subscribers/user-1");
  });

  it("get throws AlrtNotFoundError on 404", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { detail: "Not found" }));
    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    await expect(alrt.subscribers.get("nonexistent")).rejects.toThrow(AlrtNotFoundError);
  });

  it("update sends PATCH", async () => {
    const fetch = mockFetch(200, { ...SUBSCRIBER_RESPONSE, name: "Bob" });
    vi.stubGlobal("fetch", fetch);
    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    await alrt.subscribers.update("user-1", { name: "Bob" });
    expect(fetch.mock.calls[0][1].method).toBe("PATCH");
  });

  it("delete sends DELETE", async () => {
    const fetch = mockFetch(204, null);
    vi.stubGlobal("fetch", fetch);
    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    await alrt.subscribers.delete("user-1");
    expect(fetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("registerPushToken sends POST to push-tokens", async () => {
    const fetch = mockFetch(200, [
      { token: "fcm_tok", platform: "android", device_id: "dev1", last_seen: null },
    ]);
    vi.stubGlobal("fetch", fetch);
    const alrt = new Alrt({ apiKey: "alrt_sk_test" });
    const tokens = await alrt.subscribers.registerPushToken("user-1", {
      token: "fcm_tok", platform: "android", deviceId: "dev1",
    });
    expect(tokens[0].token).toBe("fcm_tok");
    expect(fetch.mock.calls[0][0]).toContain("/subscribers/user-1/push-tokens");
  });
});
