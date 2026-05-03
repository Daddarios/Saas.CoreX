import { useState, useCallback, useMemo } from 'react';
import { useSignalR } from './useSignalR';

export function useVikaChat() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const onReceive = useMemo(() => ({
    VikaAntwortChunk: (chunk) => {
       setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex].role === 'bot') {
             newMessages[lastIndex] = {
               ...newMessages[lastIndex],
               content: newMessages[lastIndex].content + chunk
             };
          } else {
             newMessages.push({ role: 'bot', content: chunk });
          }
          return newMessages;
       });
    },
    VikaAntwortFertig: () => {
       setIsTyping(false);
    },
    VikaFehler: (errorMsg) => {
       setMessages(prev => [...prev, { role: 'bot', content: `**Hata:** ${errorMsg}`, isError: true }]);
       setIsTyping(false);
    },
    VikaSchreibt: (isTypingStatus) => {
       setIsTyping(isTypingStatus);
    }
  }), []);

  const { invoke, connected, status } = useSignalR('/hubs/vika', { onReceive, autoStart: true });

  const sendMessage = useCallback(async (text) => {
     if (!text.trim()) return;
     
     if (!connected) {
       setMessages(prev => [...prev, 
         { role: 'user', content: text }, 
         { role: 'bot', content: '**Hata:** Sunucu bağlantısı yok (Offline). Backend çalışmıyor olabilir.', isError: true }
       ]);
       return;
     }

     setMessages(prev => [...prev, { role: 'user', content: text }]);
     setIsTyping(true);
     try {
       await invoke('FrageStellen', text);
     } catch (err) {
       setIsTyping(false);
       setMessages(prev => [...prev, { role: 'bot', content: `**Bağlantı Hatası:** ${err.message}`, isError: true }]);
     }
  }, [invoke, connected]);

  return { messages, isTyping, sendMessage, connected, status };
}
