import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const api = axios.create({ baseURL });

// Avtomatično dodaj JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

function forceLogout() {
  clearSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// En sam refresh naenkrat — vzporedni 401-ji si delijo isti klic.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('Ni refresh žetona.');
  // Ločen axios klic (brez interceptorjev), da se izognemo rekurziji.
  const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
  const data = res.data.data as {
    accessToken: string;
    refreshToken: string;
    user: unknown;
  };
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data.accessToken;
}

// Izvleči .data iz { success, data }; ob 401 poskusi osvežiti žeton.
api.interceptors.response.use(
  (res) => res.data.data,
  async (err: AxiosError) => {
    const original = err.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = err.response?.status;
    const isAuthCall = original?.url?.includes('/auth/');

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !isAuthCall &&
      localStorage.getItem('refreshToken')
    ) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original); // ponovi originalni zahtevek z novim žetonom
      } catch {
        refreshPromise = null;
        forceLogout();
        return Promise.reject(err.response?.data ?? err);
      }
    }

    if (status === 401 && !isAuthCall) {
      forceLogout();
    }
    return Promise.reject(err.response?.data ?? err);
  },
);

export default api;

/** Sporočilo napake iz backend odgovora (string ali seznam validacij). */
export function errorMessage(err: unknown): string {
  const e = err as { message?: string | string[] };
  if (Array.isArray(e?.message)) return e.message.join(' ');
  return e?.message ?? 'Prišlo je do napake.';
}
