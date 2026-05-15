import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSignalR } from './useSignalR';

const STORAGE_KEY = 'vika.chat.messages';
const MAX_PERSIST = 100; // son 100 mesaj saklanir
const SEND_THROTTLE_MS = 800;

const loadMessages = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function useVikaChat() {
  const [messages, setMessages] = useState(loadMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingChunk, setStreamingChunk] = useState('');
  const [lastSendAt, setLastSendAt] = useState(0);
  const streamingChunkRef = useRef('');

  useEffect(() => {
    streamingChunkRef.current = streamingChunk;
  }, [streamingChunk]);

  // Mesajlari localStorage'a yaz (oturum boyunca kalsin, logout'ta temizlenir)
  useEffect(() => {
    try {
      const trimmed = messages.slice(-MAX_PERSIST);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch { /* quota / serialize hatasi - sessizce gec */ }
  }, [messages]);

  // Logout dinleyicisi: useAuth.logout() bu event'i firlattiginda sohbet temizlenir
  useEffect(() => {
    const clear = () => {
      setMessages([]);
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    };
    window.addEventListener('vika:clearChat', clear);
    return () => window.removeEventListener('vika:clearChat', clear);
  }, []);

  const onReceive = useMemo(() => ({
    VikaAntwortChunk: (chunk) => {
       setStreamingChunk(prev => prev + (chunk ?? ''));
    },
    VikaAntwortFertig: () => {
       const finalChunk = streamingChunkRef.current;
       if (finalChunk) {
         setMessages(prev => [...prev, { role: 'bot', content: finalChunk }]);
         setStreamingChunk('');
       }
       setIsTyping(false);
    },
    VikaFehler: (errorMsg) => {
       setStreamingChunk('');
       setMessages(prev => [...prev, { role: 'bot', content: `**Hata:** ${errorMsg}`, isError: true }]);
       setIsTyping(false);
    },
    VikaSchreibt: (isTypingStatus) => {
       setIsTyping(isTypingStatus);
    }
  }), []);

  const { invoke, connected, status } = useSignalR('/hubs/vika', { onReceive, autoStart: true });

  // Reconnect/yeniden baglanma durumunda yarim kalan chunk state'ini temizle.
  useEffect(() => {
    if (status === 'reconnecting' || status === 'disconnected') {
      setStreamingChunk('');
      setIsTyping(false);
    }
  }, [status]);

  const sendMessage = useCallback(async (text) => {
     if (!text.trim()) return;

     const now = Date.now();
     if (now - lastSendAt < SEND_THROTTLE_MS) {
       setMessages(prev => [...prev, {
         role: 'bot',
         content: '**Hata:** Çok hızlı mesaj gönderiyorsunuz. Lütfen kısa süre bekleyin.',
         isError: true
       }]);
       return;
     }
     
     if (!connected) {
       setMessages(prev => [...prev, 
         { role: 'user', content: text }, 
         { role: 'bot', content: '**Hata:** Sunucu bağlantısı yok (Offline). Backend çalışmıyor olabilir.', isError: true }
       ]);
       return;
     }

     setMessages(prev => [...prev, { role: 'user', content: text }]);
     setLastSendAt(now);
     setIsTyping(true);
     try {
       await invoke('FrageStellen', text);
     } catch (err) {
       setIsTyping(false);
       setMessages(prev => [...prev, { role: 'bot', content: `**Bağlantı Hatası:** ${err.message}`, isError: true }]);
     }
  }, [invoke, connected, lastSendAt]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return { messages, isTyping, sendMessage, connected, status, clearMessages };
}
