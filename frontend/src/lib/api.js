const SESSION_KEY = 'insthink.session';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** Memanggil API Laravel (di-proxy Vite ke /api). */
export async function api(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Pastikan server lab menyala dan jaringan tersambung.', 0, null);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
    throw new ApiError(firstFieldError || data?.message || 'Terjadi kesalahan pada server. Coba lagi sebentar.', res.status, data);
  }
  return data;
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* abaikan */
  }
}

export function formatDuration(seconds) {
  if (seconds == null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} detik`;
  return s ? `${m} menit ${s} detik` : `${m} menit`;
}

export const ROLE_LABEL = {
  cashier: 'Kasir',
  warehouse: 'Stok Gudang',
};

export const PARTNER_ROLE = {
  cashier: 'warehouse',
  warehouse: 'cashier',
};

/** 50000 → "Rp50.000" */
export function formatRupiah(value) {
  return `Rp${Number(value ?? 0).toLocaleString('id-ID')}`;
}
