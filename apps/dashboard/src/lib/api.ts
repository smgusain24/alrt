const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )alrt_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setToken(token: string) {
  document.cookie = `alrt_token=${encodeURIComponent(token)}; path=/; max-age=${24 * 3600}; samesite=lax`;
}

function clearToken() {
  document.cookie = "alrt_token=; path=/; max-age=0";
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
  analytics: {
    overview: (days: number = 30) => request(`/analytics/overview?days=${days}`),
    delivery: (days: number = 30) => request(`/analytics/delivery?days=${days}`),
    workflows: () => request("/analytics/workflows"),
    timeline: (days: number = 30) => request(`/analytics/notifications/timeline?days=${days}`),
  },
  templates: {
    preview: (data: any) => request("/templates/preview", { method: "POST", body: JSON.stringify(data) }),
  },
  logs: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? "?" + new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== "" && v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
      ).toString() : "";
      return request(`/logs${qs}`);
    },
    get: (id: string) => request(`/logs/${id}`),
  },
};
