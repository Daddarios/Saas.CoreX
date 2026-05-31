import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { benutzerApi } from '../api/benutzerApi';
import { setAccessToken } from '../api/axiosClient';

const IS_DEV = import.meta.env.DEV;

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return `${local.slice(0, 2)}***`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskId(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 8) return '***';
  return `${text.slice(0, 4)}****${text.slice(-4)}`;
}

function maskPhone(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 4) return '***';
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

// Backend farklı isimlendirmeler kullanabilir (mandantId / MandantId / mandant_id / tenantId).
// Hangisi varsa onu döndür ve localStorage'a yaz.
function pickMandantId(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const id = (
    obj.mandantId ??
    obj.MandantId ??
    obj.mandant_id ??
    obj.tenantId ??
    obj.TenantId ??
    obj.mandant?.id ??
    obj.Mandant?.Id ??
    null
  );
  // Sadece null/undefined olanları filtrele, boş string kabul et (backend'den gelebilir)
  if (id == null) return null;
  return id;
}
function persistMandantId(obj) {
  const id = pickMandantId(obj);
  if (id) {
    localStorage.setItem('mandantId', String(id));
    return id;
  }
  return null;
}

function sanitizeProfileForLog(profile) {
  if (!profile || typeof profile !== 'object') return profile;
  return {
    id: maskId(profile.id),
    email: maskEmail(profile.email),
    vorname: profile.vorname ? `${String(profile.vorname).slice(0, 1)}***` : '',
    nachname: profile.nachname ? `${String(profile.nachname).slice(0, 1)}***` : '',
    rufNummer: maskPhone(profile.rufNummer),
    rolle: profile.rolle || '',
    rollen: Array.isArray(profile.rollen) ? profile.rollen.length : 0,
    mandantId: maskId(pickMandantId(profile)),
    hasBild: !!profile.bild,
  };
}

function debugAuth(...args) {
  if (IS_DEV) console.log(...args);
}

// /auth/me bazı backend'lerde bild gibi alanları döndürmez;
// eksikse /benutzer/{id} endpoint'inden tam profili çekip birleştiririz.
async function enrichProfile(profile) {
  debugAuth('[enrichProfile] Starting with profile:', sanitizeProfileForLog(profile));
  if (profile && typeof profile === 'object') {
    debugAuth('[enrichProfile] Profile keys:', Object.keys(profile));
    debugAuth('[enrichProfile] mandant candidate:', maskId(pickMandantId(profile)));
  }
  
  // Eğer zaten temel alanlar VE bild varsa, enrichment yapma (gereksiz API çağrısı)
  if (profile?.vorname && profile?.nachname && profile?.bild) {
    debugAuth('[enrichProfile] Profile already complete, skipping API call');
    return profile;
  }
  
  // Temel alanlar veya bild eksikse ve id varsa, tam profili çek
  if (profile?.id) {
    debugAuth('[enrichProfile] Fetching full profile for user ID:', maskId(profile.id));
    try {
      const res = await benutzerApi.getById(profile.id);
      const enriched = { ...profile, ...res.data };
      debugAuth('[enrichProfile] Profile enriched successfully, has bild:', !!enriched.bild);
      debugAuth('[enrichProfile] Enriched keys:', Object.keys(enriched).join(', '));
      debugAuth('[enrichProfile] MASKED ENRICHED OBJECT:', sanitizeProfileForLog(enriched));
      debugAuth('[enrichProfile] Enriched mandant candidate:', maskId(pickMandantId(enriched)));
      return enriched;
    } catch (err) {
      console.error('[enrichProfile] Failed to fetch full profile:', err);
      return profile; // Hata durumunda mevcut profili dön
    }
  }
  
  debugAuth('[enrichProfile] No ID available, returning original profile');
  return profile;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Token + user'ı birlikte set eden yardımcı
  const login = useCallback(async (userData) => {
    if (!userData) {
      debugAuth('[useAuth] Login called with no userData');
      return;
    }
    
    debugAuth('[useAuth] Login called with userData:', sanitizeProfileForLog(userData));
    
    // Token varsa kaydet (opsiyonel - backend cookie-based de olabilir)
    const token = userData.accessToken ?? userData.token ?? null;
    if (token) {
      setAccessToken(token);
      debugAuth('[useAuth] Token saved to localStorage');
    } else {
      debugAuth('[useAuth] No token in response - using cookie-based auth');
    }

    // Eğer userData'da email var ama ID yoksa, /auth/me'den tam profili al
    if ((userData.email || userData.vorname) && !userData.id) {
      debugAuth('[useAuth] Email exists but no ID, fetching from /auth/me...');
      try {
        const res = await authApi.me();
        const profile = await enrichProfile(res.data);
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
        const mandantId = persistMandantId(profile || userData);
        if (!mandantId) {
          console.warn('[useAuth] Warning: mandantId is missing after login. Check backend response.');
        }
        debugAuth('[useAuth] User profile fetched from /auth/me:', sanitizeProfileForLog(profile));
        return profile;
      } catch (err) {
        console.error('[useAuth] Failed to fetch from /auth/me:', err);
        // Fallback: userData'yı kullan
        const { accessToken: _a, token: _t, ...userInfo } = userData;
        setUser(userInfo);
        localStorage.setItem('user', JSON.stringify(userInfo));
        const mandantId = persistMandantId(userInfo || userData);
        if (!mandantId) {
          console.warn('[useAuth] Warning: mandantId is missing after login. Check backend response.');
        }
        debugAuth('[useAuth] Using fallback user data');
        return userInfo;
      }
    }

    // Eğer userData'da profil bilgisi VE ID varsa direkt kullan
    if ((userData.email || userData.vorname) && userData.id) {
      const { accessToken: _a, token: _t, ...rawInfo } = userData;
      debugAuth('[useAuth] Enriching profile with user data (has ID)...');
      const userInfo = await enrichProfile(rawInfo);
      setUser(userInfo);
      localStorage.setItem('user', JSON.stringify(userInfo));
      const mandantId = persistMandantId(userInfo || userData);
      if (!mandantId) {
        console.warn('[useAuth] Warning: mandantId is missing after login. Check backend response.');
      }
      debugAuth('[useAuth] User profile saved successfully:', sanitizeProfileForLog(userInfo));
      return userInfo;
    }

    // Eğer userData'da sadece token/mesaj varsa, profili me endpoint'inden al
    persistMandantId(userData);
    try {
      debugAuth('[useAuth] No profile data, fetching from /auth/me...');
      const res = await authApi.me();
      const profile = await enrichProfile(res.data);
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      const mandantId = persistMandantId(profile || userData);
      if (!mandantId) {
        console.warn('[useAuth] Warning: mandantId is missing after login. Check backend response.');
      }
      debugAuth('[useAuth] User profile fetched and saved:', sanitizeProfileForLog(profile));
      return profile;
    } catch (err) {
      console.error('[useAuth] Failed to fetch profile from /auth/me:', err);
      const { accessToken: _a, token: _t, ...userInfo } = userData;
      setUser(userInfo);
      localStorage.setItem('user', JSON.stringify(userInfo));
      debugAuth('[useAuth] Using fallback user data');
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
    // Sohbet gecmisini temizle (kullanici degisebilir)
    try { localStorage.removeItem('vika.chat.messages'); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('vika:clearChat'));
  }, []);

  // Uygulama açıldığında session'ı doğrula
  useEffect(() => {
    let cancelled = false;

    (async () => {
      debugAuth('[useAuth] App initialization started');
      
      // 🔥 FIX: Login veya verify sayfasındaysak session kontrolü yapma!
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/verify') {
        debugAuth('[useAuth] On auth page, skipping session check');
        if (!cancelled) setIsLoading(false);
        return;
      }
      
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');
      debugAuth('[useAuth] Stored token:', storedToken ? 'EXISTS' : 'NULL');
      debugAuth('[useAuth] Stored user:', storedUser ? 'EXISTS' : 'NULL');
      
      // Eğer localStorage'da user varsa, önce onu yükle (instant UI)
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          debugAuth('[useAuth] Restored user from localStorage:', sanitizeProfileForLog(userData));
          if (!cancelled) setUser(userData);
        } catch (e) {
          console.error('[useAuth] Failed to parse stored user:', e);
        }
      }
      
      try {
        // Backend'den güncel profili al (cookie-based auth)
        const res = await authApi.me();
        debugAuth('[useAuth] /auth/me successful:', sanitizeProfileForLog(res.data));
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
          try { localStorage.removeItem('vika.chat.messages'); } catch { /* ignore */ }
          window.dispatchEvent(new CustomEvent('vika:clearChat'));
          debugAuth('[useAuth] Session cleared');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          debugAuth('[useAuth] Initialization complete');
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


