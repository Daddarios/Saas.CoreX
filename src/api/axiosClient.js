import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — Mandant header ekle
axiosClient.interceptors.request.use((config) => {
  const mandantId = localStorage.getItem('mandantId');
  if (mandantId) {
    config.headers['X-Mandant-Id'] = mandantId;
  }
  return config;
});

// Response interceptor — 401 → refresh dene, başarısızsa login'e yönlendir
let isRefreshing = false;

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Auth endpoint'lerinde refresh deneme — sonsuz döngü olur
    const isAuthUrl = original.url?.includes('/auth/login')
      || original.url?.includes('/auth/verify')
      || original.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original._retry && !isAuthUrl && !isRefreshing) {
      original._retry = true;
      isRefreshing = true;
      try {
        await axiosClient.post('/auth/refresh');
        isRefreshing = false;
        return axiosClient(original);
      } catch {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
