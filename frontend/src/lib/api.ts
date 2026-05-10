const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

/**
 * Type-safe fetch wrapper for the NextOSINT API.
 * All calls go through the Next.js proxy → backend.
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; cached: boolean }> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `Request failed: ${res.status}`;
    throw new Error(message);
  }

  const body = (await res.json()) as { success: boolean; data: T; cached: boolean };
  return { data: body.data, cached: body.cached };
}

// ─── Investigation endpoints ──────────────────────────────────

export function investigateEmail(email: string) {
  return request<unknown>('/investigate/email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function investigateIp(ip: string) {
  return request<unknown>('/investigate/ip', {
    method: 'POST',
    body: JSON.stringify({ ip }),
  });
}

export function investigateDomain(domain: string) {
  return request<unknown>('/investigate/domain', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  });
}

export function investigateUrl(url: string) {
  return request<unknown>('/investigate/url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// ─── History ──────────────────────────────────────────────────

export function fetchHistory(params: {
  page?: number;
  limit?: number;
  type?: string;
  riskLevel?: string;
  search?: string;
}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.type) query.set('type', params.type);
  if (params.riskLevel) query.set('riskLevel', params.riskLevel);
  if (params.search) query.set('search', params.search);

  return request<unknown>(`/history?${query.toString()}`);
}

export function fetchInvestigation(id: string) {
  return request<unknown>(`/history/${id}`);
}

// ─── Dashboard ────────────────────────────────────────────────

export function fetchDashboardStats() {
  return request<unknown>('/dashboard/stats');
}
