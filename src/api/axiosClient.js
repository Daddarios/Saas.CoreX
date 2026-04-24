import axios from 'axios';

// -----------------------------------------------------------------
// Access token management (httpOnly cookie + memory-based token)
// -----------------------------------------------------------------
let _accessToken = null;

export const setAccessToken = (token) => {
  _accessToken = token ?? null;
};

export const getAccessToken = () => _accessToken;

// -----------------------------------------------------------------
// Axios instance configuration
// -----------------------------------------------------------------
const axiosClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true, // HTTP-only cookie support (refresh token)
  timeout: 30000, // 30 saniye timeout
});

// -----------------------------------------------------------------
// Request interceptor — Authorization + X-Mandant-Id + Content-Type handling
// -----------------------------------------------------------------
axiosClient.interceptors.request.use(
  (config) => {
    // 1️⃣ Authorization header ekle (eğer token varsa)
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 2️⃣ Mandant ID ekle (multi-tenancy için)
    const mandantId = localStorage.getItem('mandantId');
    if (mandantId) {
      config.headers['X-Mandant-Id'] = mandantId;
    }

    // 3️⃣ Content-Type düzenlemesi (FormData için otomatik, JSON için manuel)
    if (config.data instanceof FormData) {
      // FormData için Content-Type'ı SİL — Axios otomatik boundary ekler
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      // JSON istekleri için Content-Type ekle (sadece yoksa)
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// -----------------------------------------------------------------
// Response interceptor — 401 handling with token refresh queue
// -----------------------------------------------------------------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Auth endpoint kontrolü (refresh loop'u engellemek için)
const AUTH_ENDPOINTS = ['/auth/login', '/auth/verify', '/auth/refresh', '/auth/me', '/auth/logout'];
const isAuthEndpoint = (url) => AUTH_ENDPOINTS.some((endpoint) => url?.includes(endpoint));

// Backend hata mesajı normalizasyonu (nachricht/message/title alanları)
const normalizeError = (error) => {
  const data = error.response?.data;
  const status = error.response?.status;
  const url = error.config?.url;

  if (data) {
    // Konsola detaylı hata logla
    console.error(`[${status}] ${url}:`, JSON.stringify(data, null, 2));

    // Backend'den gelen farklı hata formatlarını standartlaştır
    if (!data.message) {
      if (data.nachricht) {
        data.message = data.nachricht;
      } else if (data.title) {
        data.message = data.title;
      }
    }

    // Validation errors (errors/fehler) varsa birleştir
    const validationErrors = data.errors || data.fehler;
    if (!data.message && validationErrors && typeof validationErrors === 'object') {
      const messages = Object.values(validationErrors).flat();
      if (messages.length > 0) {
        data.message = messages.join('; ');
      }
    }

    // Fallback: Hiçbir mesaj yoksa generic hata
    if (!data.message) {
      data.message = `Sunucu hatası (${status})`;
    }
  }

  return error;
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Hata mesajını normalize et
    normalizeError(error);

    const originalRequest = error.config;

    // 401 değilse veya auth endpoint'iyse hemen reject et
    if (error.response?.status !== 401 || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Eğer token refresh zaten devam ediyorsa, bu isteği kuyruğa ekle
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (token) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return axiosClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Token refresh işlemini başlat
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // /auth/refresh endpoint'ini çağır (httpOnly cookie ile)
      const refreshResponse = await axiosClient.post('/auth/refresh');
      const newToken = refreshResponse.data?.accessToken ?? refreshResponse.data?.token ?? null;

      if (newToken) {
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      } else {
        // Token body'de yoksa cookie'den okunacak, Authorization header'ı kaldır
        processQueue(null, null);
        delete originalRequest.headers['Authorization'];
      }

      isRefreshing = false;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      // Refresh başarısız — kullanıcıyı logout et
      processQueue(refreshError, null);
      isRefreshing = false;
      setAccessToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('mandantId');

      // Login sayfasına yönlendir
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    }
  }
);

export default axiosClient;