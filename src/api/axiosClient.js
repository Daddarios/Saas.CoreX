import axios from 'axios';

// -----------------------------------------------------------------
// Access token management (localStorage + memory-based token)
// -----------------------------------------------------------------
let _accessToken = null;

// Uygulama ilk yüklendiğinde localStorage'dan token'ı yükle
const initializeToken = () => {
  const storedToken = localStorage.getItem('accessToken');
  if (storedToken) {
    _accessToken = storedToken;
  }
};

// İlk yükleme
initializeToken();

export const setAccessToken = (token) => {
  _accessToken = token ?? null;
  
  // Token'ı localStorage'a da kaydet (sayfa yenilemede kaybetmemek için)
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

export const getAccessToken = () => {
  // Memory'de yoksa localStorage'dan yükle
  if (!_accessToken) {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      _accessToken = storedToken;
    }
  }
  return _accessToken;
};

// -----------------------------------------------------------------
// Axios instance configuration
// -----------------------------------------------------------------
// API base origin (avatar URL'leri için kullanılır)
export const API_ORIGIN = 'http://localhost:8080';

// Göreceli ya da tam avatar URL'ini tam URL'e dönüştürür
export function getAvatarUrl(bild) {
  if (!bild) return null;
  if (bild.startsWith('http://') || bild.startsWith('https://') || bild.startsWith('data:')) return bild;
  return `${API_ORIGIN}${bild.startsWith('/') ? '' : '/'}${bild}`;
}

const axiosClient = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true, // HTTP-only cookie support (refresh token)
  timeout: 30000, // 30 saniye timeout
});

// -----------------------------------------------------------------
// Request interceptor — Authorization + X-Mandant-Id + Content-Type handling
// -----------------------------------------------------------------
axiosClient.interceptors.request.use(
  (config) => {
    // 1️⃣ Authorization header ekle (eğer token varsa)
    // Not: Backend cookie-based auth kullanıyorsa token olmayabilir - bu normal!
    const token = getAccessToken();
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log(`[axios] Request to ${config.url} WITH token`);
    } else {
      console.log(`[axios] Request to ${config.url} WITHOUT token (cookie-based)`);
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
// Not: /auth/me burada YOK — sayfa yenilemede 401 gelirse refresh denensin
// ANCAK: /auth/me login olmamış kullanıcıda 401 verir, bu durumda refresh denemeden reject et
const AUTH_ENDPOINTS = ['/auth/login', '/auth/verify', '/auth/refresh', '/auth/logout'];
const NO_RETRY_ENDPOINTS = ['/auth/me']; // Bu endpoint'ler için retry YAPMA (user henüz authenticated değil)
const isAuthEndpoint = (url) => AUTH_ENDPOINTS.some((endpoint) => url?.includes(endpoint));
const isNoRetryEndpoint = (url) => NO_RETRY_ENDPOINTS.some((endpoint) => url?.includes(endpoint));

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

    // 401 değilse veya auth endpoint'iyse veya no-retry endpoint'iyse hemen reject et
    if (
      error.response?.status !== 401 || 
      originalRequest._retry || 
      isAuthEndpoint(originalRequest.url) ||
      isNoRetryEndpoint(originalRequest.url)
    ) {
      console.log(`[axios] Response error ${error.response?.status} for ${originalRequest.url}, no retry`);
      return Promise.reject(error);
    }

    console.log(`[axios] 401 error for ${originalRequest.url}, attempting token refresh...`);

    // Eğer token refresh zaten devam ediyorsa, bu isteği kuyruğa ekle
    if (isRefreshing) {
      console.log('[axios] Refresh already in progress, queuing request...');
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
      console.log('[axios] Calling /auth/refresh...');
      // /auth/refresh endpoint'ini çağır (httpOnly cookie ile)
      const refreshResponse = await axiosClient.post('/auth/refresh');
      const newToken = refreshResponse.data?.accessToken ?? refreshResponse.data?.token ?? null;

      if (newToken) {
        console.log('[axios] Refresh successful WITH token - saving to localStorage');
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      } else {
        console.log('[axios] Refresh successful WITHOUT token - using cookie-based auth');
        // Token body'de yoksa cookie'den okunacak, Authorization header'ı kaldır
        processQueue(null, null);
        delete originalRequest.headers['Authorization'];
      }

      isRefreshing = false;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      console.error('[axios] Refresh failed:', refreshError.response?.status, refreshError.response?.data);
      // Refresh başarısız — kullanıcıyı logout et
      processQueue(refreshError, null);
      isRefreshing = false;
      setAccessToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('mandantId');
      localStorage.removeItem('accessToken');

      // Login sayfasına yönlendir (ama zaten oradaysak yönlendirme!)
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/verify') {
          console.log('[axios] Redirecting to /login');
          window.location.href = '/login';
        } else {
          console.log('[axios] Already on auth page, skipping redirect');
        }
      }

      return Promise.reject(refreshError);
    }
  }
);

export default axiosClient;