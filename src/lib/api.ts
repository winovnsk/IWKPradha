/**
 * Unified API Client for IWK RT 11
 * 
 * Supports dual mode:
 * - LOCAL: Calls Next.js API routes (default, uses Prisma DB)
 * - GAS: Directly calls Google Apps Script backend
 * 
 * To switch to GAS mode, set NEXT_PUBLIC_GAS_URL in .env
 * Example: NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/YOUR_ID/exec
 */

const GAS_DIRECT = typeof window !== 'undefined' ? (window as unknown as Record<string, string>).NEXT_PUBLIC_GAS_URL || '' : '';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('iwk_token') || '';
}

// ── GAS Direct Communication (browser → GAS) ──
async function gasDirect(action: string, params: Record<string, unknown> = {}, method = 'POST') {
  const token = getToken();
  if (method === 'POST') {
    const res = await fetch(GAS_DIRECT, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, ...params }),
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { success: false, message: text }; }
  }
  const qs = new URLSearchParams({ action, token, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${GAS_DIRECT}?${qs}`, { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false, message: text }; }
}

// ── Local Proxy Communication (browser → Next.js → Prisma/GAS) ──
async function localProxy(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params, token: getToken() }),
  });
  return res.json();
}

// ── Unified call function ──
async function call(action: string, params: Record<string, unknown> = {}, method = 'POST') {
  if (GAS_DIRECT) return gasDirect(action, params, method);
  return localProxy(action, params);
}

// ── Direct API calls (for endpoints not in GAS) ──
// Client-side request deduplication: prevents duplicate in-flight requests
const inflightMap = new Map<string, Promise<unknown>>();
const clientCache = new Map<string, { data: unknown; expiresAt: number }>();
const CLIENT_TTL = 5_000; // 5 seconds

async function apiFetch(url: string, options?: RequestInit): Promise<unknown> {
  const isMutating = options?.method === 'POST' || options?.method === 'PUT' || options?.method === 'DELETE';

  // Check client cache first (only for non-mutating requests)
  if (!isMutating) {
    const cached = clientCache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  // Deduplicate in-flight requests
  const inflight = inflightMap.get(url);
  if (inflight) return inflight;

  // When body is FormData, let the browser set Content-Type with boundary
  const fetchOptions: RequestInit = { ...options };
  if (fetchOptions.body instanceof FormData && fetchOptions.headers) {
    const headers = new Headers(fetchOptions.headers);
    headers.delete('Content-Type');
    fetchOptions.headers = headers;
  }

  const promise = fetch(url, fetchOptions).then(async (res) => {
    const data = await res.json();
    // Cache GET responses only
    if (!isMutating) {
      clientCache.set(url, { data, expiresAt: Date.now() + CLIENT_TTL });
      // Auto-cleanup after TTL
      setTimeout(() => clientCache.delete(url), CLIENT_TTL + 1000);
    }
    inflightMap.delete(url);
    return data;
  }).catch((err) => {
    inflightMap.delete(url);
    throw err;
  });

  inflightMap.set(url, promise);
  return promise;
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API EXPORTS
// ═══════════════════════════════════════════════════════════

export const api = {
  // ── Auth ──
  login: (identifier: string, password: string) =>
    apiFetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) }),

  register: (data: Record<string, string>) =>
    apiFetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),

  // ── Public Data ──
  getSettings: () => apiFetch('/api/settings'),
  getAnnouncements: (limit = 10) => apiFetch(`/api/announcements?limit=${limit}`),
  getEvents: (limit = 20) => apiFetch(`/api/events?limit=${limit}`),
  getDashboard: () => apiFetch('/api/dashboard'),

  // ── Combined Laporan Data (1 call replaces dashboard + transactions) ──
  getLaporanData: (startDate?: string) => {
    const params = startDate ? `?startDate=${startDate}` : '';
    return apiFetch(`/api/laporan/data${params}`) as Promise<{ success: boolean; data: Record<string, unknown> }>;
  },
  getTransactions: (type = '', status = '', limit = 50, userId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    params.set('limit', String(limit));
    if (userId) params.set('userId', userId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return apiFetch(`/api/transactions?${params.toString()}`);
  },
  getUnpaidMonths: (userId?: string) => {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    return apiFetch(`/api/users/unpaid?${params.toString()}`);
  },

  // ── Profile ──
  updateProfile: (userId: string, data: { nama?: string; alamat?: string; noHp?: string; email?: string; foto?: string }) =>
    apiFetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
    }),

  // ── Events CRUD ──
  createEvent: (data: Record<string, unknown>) =>
    apiFetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateEvent: (data: Record<string, unknown>) =>
    apiFetch('/api/events', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  deleteEvent: (id: string) =>
    apiFetch(`/api/events?id=${id}`, { method: 'DELETE' }),

  // ── Announcements CRUD ──
  createAnnouncement: (data: Record<string, unknown>) =>
    apiFetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateAnnouncement: (data: Record<string, unknown>) =>
    apiFetch('/api/announcements', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) =>
    apiFetch(`/api/announcements?id=${id}`, { method: 'DELETE' }),

  // ── File Upload ──
  uploadFiles: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return apiFetch('/api/upload', { method: 'POST', body: formData }) as Promise<{
      success: boolean;
      data?: { url: string; name: string; size: number; type: string }[];
    }>;
  },
  deleteFiles: (urls: string[]) =>
    apiFetch(`/api/upload?${urls.map((u) => `url=${encodeURIComponent(u)}`).join('&')}`, { method: 'DELETE' }),

  // ── GAS Actions (local proxy or direct GAS) ──
  gas: call,
};
