const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("alrt_token");
}

function setToken(token: string) {
  localStorage.setItem("alrt_token", token);
}

function clearToken() {
  localStorage.removeItem("alrt_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    if (typeof window !== "undefined" && !path.startsWith("/auth/")) {
      clearToken();
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export const api = {
  auth: {
    signup: async (data: { email: string; password: string; name?: string; team_name: string }) => {
      const res: any = await request("/auth/signup", { method: "POST", body: JSON.stringify(data) });
      if (res.token) setToken(res.token);
      return res;
    },
    login: async (data: { email: string; password: string }) => {
      const res: any = await request("/auth/login", { method: "POST", body: JSON.stringify(data) });
      if (res.token) setToken(res.token);
      return res;
    },
    me: () => request("/auth/me"),
    logout: async () => {
      await request("/auth/logout", { method: "POST" }).catch(() => { });
      clearToken();
    },
  },
  workflows: {
    list: () => request("/workflows"),
    get: (id: string) => request(`/workflows/${id}`),
    create: (data: any) => request("/workflows", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/workflows/${id}`, { method: "DELETE" }),
    update: (id: string, data: any) => request(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    publish: (id: string) => request(`/workflows/${id}/publish`, { method: "POST" }),
  },
  subscribers: {
    list: (limit = 20, offset = 0) => request(`/subscribers?limit=${limit}&offset=${offset}`),
    get: (id: string) => request(`/subscribers/${id}`),
    create: (data: any) => request("/subscribers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/subscribers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/subscribers/${id}`, { method: "DELETE" }),
  },
  notifications: {
    list: (externalId: string, params?: string) => request(`/subscribers/${externalId}/notifications${params ? '?' + params : ''}`),
  },
  apiKeys: {
    list: (teamId: string) => request(`/teams/${teamId}/api-keys`),
    create: (teamId: string, data?: any) =>
      request(`/teams/${teamId}/api-keys`, { method: "POST", body: JSON.stringify(data || {}) }),
    revoke: (teamId: string, keyId: string) =>
      request(`/teams/${teamId}/api-keys/${keyId}`, { method: "DELETE" }),
  },
  providers: {
    list: () => request("/providers"),
    create: (data: any) => request("/providers", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/providers/${id}`, { method: "DELETE" }),
  },
  channels: {
    updateDiscordConfig: (webhookUrl: string) =>
      request("/channels/discord/config", { method: "PUT", body: JSON.stringify({ webhook_url: webhookUrl }) }),
  },
  analytics: {
    overview: (days: number = 30) => request(`/analytics/overview?days=${days}`),
    delivery: (days: number = 30) => request(`/analytics/delivery?days=${days}`),
    workflows: () => request("/analytics/workflows"),
    timeline: (days: number = 30) => request(`/analytics/notifications/timeline?days=${days}`),
  },
  templates: {
    preview: (data: any) => request("/templates/preview", { method: "POST", body: JSON.stringify(data) }),
  },
  invites: {
    listMembers: (teamId: string) =>
      request<{ members: Array<{
        id: string; email: string; name: string | null; role: string;
        created_at: string; last_login_at: string | null; record_type: string;
      }> }>(`/teams/${teamId}/members`),
    create: (teamId: string, data: { email: string; role: string }) =>
      request<{
        id: string; team_id: string; email: string; role: string;
        expires_at: string; created_at: string; invite_url: string;
      }>(`/teams/${teamId}/invites`, { method: "POST", body: JSON.stringify(data) }),
    delete: (teamId: string, inviteId: string) =>
      request(`/teams/${teamId}/invites/${inviteId}`, { method: "DELETE" }),
    getInviteInfo: (token: string) =>
      request<{ email: string; role: string; team_id: string }>(`/auth/accept-invite?token=${token}`),
    acceptInvite: async (data: { token: string; password: string; name?: string }) => {
      const res = await request<{ token: string; email: string; role: string }>("/auth/accept-invite", {
        method: "POST", body: JSON.stringify(data),
      });
      if (res.token) setToken(res.token);
      return res;
    },
  },
  activity: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? "?" + new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== "" && v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
      ).toString() : "";
      return request(`/activity${qs}`);
    },
  },
};
