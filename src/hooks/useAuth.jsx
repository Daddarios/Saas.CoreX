import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { setAccessToken } from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Token + user'ı birlikte set eden yardımcı
  const login = useCallback((userData) => {
    if (!userData) return;
    const token = userData.accessToken ?? userData.token ?? null;
    if (token) setAccessToken(token);

    // Objeyi token alanlarından temizleyerek sakla
    const { accessToken: _a, token: _t, ...userInfo } = userData;
    setUser(userInfo);
    localStorage.setItem('user', JSON.stringify(userInfo));
    if (userInfo.mandantId) {
      localStorage.setItem('mandantId', userInfo.mandantId);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('mandantId');
  }, []);

  // Uygulama açıldığında session'ı doğrula
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await authApi.me();
        if (!cancelled) login(res.data);
      } catch {
        // 401 → axiosClient zaten refresh dener; o da başarısız olursa
        // interceptor login'e yönlendirir. Buraya sadece kritik hatalar düşer.
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [login]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
