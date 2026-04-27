import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { benutzerApi } from '../api/benutzerApi';
import { setAccessToken } from '../api/axiosClient';

// /auth/me bazı backend'lerde bild gibi alanları döndürmez;
// eksikse /benutzer/{id} endpoint'inden tam profili çekip birleştiririz.
async function enrichProfile(profile) {
  console.log('[enrichProfile] Starting with profile:', profile?.email, 'has bild:', !!profile?.bild);
  
  // Eğer zaten temel alanlar VE bild varsa, enrichment yapma (gereksiz API çağrısı)
  if (profile?.vorname && profile?.nachname && profile?.bild) {
    console.log('[enrichProfile] Profile already complete, skipping API call');
    return profile;
  }
  
  // Temel alanlar veya bild eksikse ve id varsa, tam profili çek
  if (profile?.id) {
    console.log('[enrichProfile] Fetching full profile for user ID:', profile.id);
    try {
      const res = await benutzerApi.getById(profile.id);
      const enriched = { ...profile, ...res.data };
      console.log('[enrichProfile] Profile enriched successfully, has bild:', !!enriched.bild);
      return enriched;
    } catch (err) {
      console.error('[enrichProfile] Failed to fetch full profile:', err);
      return profile; // Hata durumunda mevcut profili dön
    }
  }
  
  console.log('[enrichProfile] No ID available, returning original profile');
  return profile;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Token + user'ı birlikte set eden yardımcı
  const login = useCallback(async (userData) => {
    if (!userData) {
      console.log('[useAuth] Login called with no userData');
      return;
    }
    
    console.log('[useAuth] Login called with userData:', userData);
    
    // Token varsa kaydet (opsiyonel - backend cookie-based de olabilir)
    const token = userData.accessToken ?? userData.token ?? null;
    if (token) {
      setAccessToken(token);
      console.log('[useAuth] Token saved to localStorage');
    } else {
      console.log('[useAuth] No token in response - using cookie-based auth');
    }

    // Eğer userData'da email var ama ID yoksa, /auth/me'den tam profili al
    if ((userData.email || userData.vorname) && !userData.id) {
      console.log('[useAuth] Email exists but no ID, fetching from /auth/me...');
      try {
        const res = await authApi.me();
        const profile = await enrichProfile(res.data);
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
        if (profile.mandantId) localStorage.setItem('mandantId', profile.mandantId);
        console.log('[useAuth] ✅ User profile fetched from /auth/me:', profile.email, 'has avatar:', !!profile.bild);
        return profile;
      } catch (err) {
        console.error('[useAuth] Failed to fetch from /auth/me:', err);
        // Fallback: userData'yı kullan
        const { accessToken: _a, token: _t, ...userInfo } = userData;
        setUser(userInfo);
        localStorage.setItem('user', JSON.stringify(userInfo));
        return userInfo;
      }
    }

    // Eğer userData'da profil bilgisi VE ID varsa direkt kullan
    if ((userData.email || userData.vorname) && userData.id) {
      const { accessToken: _a, token: _t, ...rawInfo } = userData;
      console.log('[useAuth] Enriching profile with user data (has ID)...');
      const userInfo = await enrichProfile(rawInfo);
      setUser(userInfo);
      localStorage.setItem('user', JSON.stringify(userInfo));
      if (userInfo.mandantId) localStorage.setItem('mandantId', userInfo.mandantId);
      console.log('[useAuth] ✅ User profile saved successfully:', userInfo.email, 'has avatar:', !!userInfo.bild);
      return userInfo;
    }

    // Eğer userData'da sadece token/mesaj varsa, profili me endpoint'inden al
    if (userData.mandantId) localStorage.setItem('mandantId', userData.mandantId);
    try {
      console.log('[useAuth] No profile data, fetching from /auth/me...');
      const res = await authApi.me();
      const profile = await enrichProfile(res.data);
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      if (profile.mandantId) localStorage.setItem('mandantId', profile.mandantId);
      console.log('[useAuth] ✅ User profile fetched and saved:', profile.email, 'has avatar:', !!profile.bild);
      return profile;
    } catch (err) {
      console.error('[useAuth] Failed to fetch profile from /auth/me:', err);
      const { accessToken: _a, token: _t, ...userInfo } = userData;
      setUser(userInfo);
      localStorage.setItem('user', JSON.stringify(userInfo));
      console.log('[useAuth] Using fallback user data');
      return userInfo;
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
    localStorage.removeItem('accessToken');
  }, []);

  // Uygulama açıldığında session'ı doğrula
  useEffect(() => {
    let cancelled = false;

    (async () => {
      console.log('[useAuth] App initialization started');
      
      // 🔥 FIX: Login veya verify sayfasındaysak session kontrolü yapma!
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/verify') {
        console.log('[useAuth] On auth page, skipping session check');
        if (!cancelled) setIsLoading(false);
        return;
      }
      
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');
      console.log('[useAuth] Stored token:', storedToken ? 'EXISTS' : 'NULL');
      console.log('[useAuth] Stored user:', storedUser ? 'EXISTS' : 'NULL');
      
      // Eğer localStorage'da user varsa, önce onu yükle (instant UI)
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('[useAuth] Restored user from localStorage:', userData.email);
          if (!cancelled) setUser(userData);
        } catch (e) {
          console.error('[useAuth] Failed to parse stored user:', e);
        }
      }
      
      try {
        // Backend'den güncel profili al (cookie-based auth)
        const res = await authApi.me();
        console.log('[useAuth] /auth/me successful:', res.data.email);
        if (!cancelled) {
          await login(res.data);
        }
      } catch (err) {
        console.error('[useAuth] /auth/me failed:', err.response?.status, err.response?.data?.message);
        // 401 → axiosClient zaten refresh dener; o da başarısız olursa
        // interceptor login'e yönlendirir. Buraya sadece kritik hatalar düşer.
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          console.log('[useAuth] Session cleared');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          console.log('[useAuth] Initialization complete');
        }
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


