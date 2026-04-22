import axios from 'axios';

// -----------------------------------------------------------------
// Access token — module-level, sessionStorage fallback'li
// -----------------------------------------------------------------
let _accessToken = sessionStorage.getItem('accessToken') || null;

export const setAccessToken = (token) => {
  _accessToken = token ?? null;
  if (_accessToken) {
    sessionStorage.setItem('accessToken', _accessToken);
  } else {
    sessionStorage.removeItem('accessToken');
  }
};

export const getAccessToken = () => _accessToken;

// -----------------------------------------------------------------
// Axios instance
// -----------------------------------------------------------------
const axiosClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true, // HTTP-only refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

// -----------------------------------------------------------------
// Request interceptor — Authorization + X-Mandant-Id
// -----------------------------------------------------------------
axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const mandantId = localStorage.getItem('mandantId');
  if (mandantId) {
    config.headers['X-Mandant-Id'] = mandantId;
  }
  return config;
});

// -----------------------------------------------------------------
// Response interceptor — 401 → queue-based refresh, infinite-loop koruması
// -----------------------------------------------------------------
let isRefreshing = false;
let failedQueue = []; // { resolve, reject }[] — refresh bekliyenler

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

const AUTH_URLS = ['/auth/login', '/auth/verify', '/auth/refresh', '/auth/me'];
const isAuthEndpoint = (url) => AUTH_URLS.some((u) => url?.includes(u));

// Backend hata mesajı normalizasyonu — 'nachricht' veya 'message' alanını okur
const normalizeError = (error) => {
  const data = error.response?.data;
  if (data) {
    console.error('Backend Hatası:', data);
    if (!data.message && data.nachricht) {
      data.message = data.nachricht;
    }
    // Validation errors (errors veya fehler) varsa birleştir
    const validationErrors = data.errors || data.fehler;
    if (!data.message && validationErrors) {
      const msgs = Object.values(validationErrors).flat();
      if (msgs.length) data.message = msgs.join('; ');
    }
  }
  return error;
};

axiosClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    normalizeError(error);
    const original = error.config;

    if (error.response?.status !== 401 || original._retry || isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }

    // Başka bir refresh zaten dönüyor → kuyruğa ekle
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (token) original.headers['Authorization'] = `Bearer ${token}`;
        return axiosClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshRes = await axiosClient.post('/auth/refresh');
      const newToken = refreshRes.data?.accessToken ?? refreshRes.data?.token ?? null;
      if (newToken) setAccessToken(newToken);

      processQueue(null, newToken);
      isRefreshing = false;

      if (newToken) original.headers['Authorization'] = `Bearer ${newToken}`;
      return axiosClient(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      isRefreshing = false;
      setAccessToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('mandantId');
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    }
  },
);

export default axiosClient;
