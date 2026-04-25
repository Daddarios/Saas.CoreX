import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { benutzerApi } from '../api/benutzerApi';
import { setAccessToken } from '../api/axiosClient';

// /auth/me bazı backend'lerde bild gibi alanları döndürmez;
// eksikse /benutzer/{id} endpoint'inden tam profili çekip birleştiririz.
async function enrichProfile(profile) {
  if (!profile?.bild && profile?.id) {
    try {
      const res = await benutzerApi.getById(profile.id);
      return { ...profile, ...res.data };
    } catch { /* sessizce devam et */ }
  }
  return profile;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Token + user'ı birlikte set eden yardımcı
  const login = useCallback(async (userData) => {
    if (!userData) return;
    const token = userData.accessToken ?? userData.token ?? null;
    if (token) setAccessToken(token);

    // Eğer userData'da profil bilgisi varsa direkt kullan, yoksa /auth/me çek
    if (userData.email || userData.vorname) {
      const { accessToken: _a, token: _t, ...rawInfo } = userData;
      // /auth/me bild gibi alanları döndürmeyebilir; tam profili çekerek zenginleştir
      const userInfo = await enrichProfile(rawInfo);
      setUser(userInfo);
      localStorage.setItem('user', JSON.stringify(userInfo));
      if (userInfo.mandantId) localStorage.setItem('mandantId', userInfo.mandantId);
    } else {
      // Login response sadece token/mesaj içeriyor, profili me endpoint'inden al
      if (userData.mandantId) localStorage.setItem('mandantId', userData.mandantId);
      try {
        const res = await authApi.me();
        const profile = await enrichProfile(res.data); // bild eksikse /benutzer/{id}'den tamamla
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
        if (profile.mandantId) localStorage.setItem('mandantId', profile.mandantId);
      } catch {
        // me başarısız olursa mevcut veriyi sakla
        const { accessToken: _a, token: _t, ...userInfo } = userData;
        setUser(userInfo);
        localStorage.setItem('user', JSON.stringify(userInfo));
      }
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
