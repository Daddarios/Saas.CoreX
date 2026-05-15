import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useVikaChat } from '../../../hooks/useVikaChat';
import { useLanguage } from '../../../hooks/useLanguage';
import { getAvatarUrl } from '../../../api/axiosClient';
import '../../../styles/VikaChat.css';

export default function VikaChat({ raumId }) {
  const [inputText, setInputText] = useState('');
  const { messages, isTyping, sendMessage, connected, status, clearMessages } = useVikaChat();
  const { t } = useLanguage();
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  // raumId'yi props'tan al veya fallback
  const effectiveRaumId = raumId || '00000000-0000-0000-0000-000000000000';

  useEffect(() => {
    if (!isTyping && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="vika-chat-container">
      <div className="vika-chat-header">
        <div className="vika-header-info">
          <div className="vika-avatar-container">
            <i className="bi bi-robot vika-avatar-icon"></i>
            <span className={`vika-status-dot ${status}`}></span>
          </div>
          <div className="vika-header-text">
            <div className="vika-title-row">
              <h2 className="vika-title">ViKA</h2>
              <span className="vika-title-sep">·</span>
              <p className="vika-subtitle vika-subtitle-primary">
                <i className="bi bi-stars me-1"></i>
                {t('chat.aiAssistant', 'AI Assistant')}
              </p>
            </div>
            <span className={`vika-status-pill ${status}`}>
              <span className="vika-status-pill-dot"></span>
              {status === 'connected'
                ? t('common.online', 'Çevrimiçi')
                : status === 'connecting'
                  ? t('common.loading', 'Bağlanıyor...')
                  : t('common.offline', 'Çevrimdışı')}
            </span>
          </div>
        </div>
        <button className="vika-options-btn" title={t('common.settings', 'Ayarlar')}>
          <i className="bi bi-three-dots"></i>
        </button>
      </div>

      <div className="vika-chat-body" ref={bodyRef}>
        {messages.length === 0 && (
          <div className="vika-empty-state">
            <div className="vika-empty-icon-wrapper">
              <i className="bi bi-stars"></i>
            </div>
            <h4 className="vika-empty-title">VIKA AI</h4>
            <p className="vika-empty-desc">{t('chat.vikaWelcome', 'Size nasıl yardımcı olabilirim?')}</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`vika-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
            {msg.istDatei ? (
              <div>
                {msg.dateiTyp && msg.dateiTyp.startsWith('image/') ? (
                  <img src={getAvatarUrl(msg.dateiPfad)} alt={msg.dateiName} style={{ maxWidth: 200, borderRadius: 8 }} />
                ) : (
                  <a href={getAvatarUrl(msg.dateiPfad)} download target="_blank" rel="noopener noreferrer">
                    <i className="bi bi-paperclip"></i> {msg.dateiName}
                  </a>
                )}
                <div className="file-meta">
                  {msg.dateiTyp} · {(msg.dateiGroesse/1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              msg.role === 'user'
                ? <div>{msg.content}</div>
                : <div className="vika-markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="vika-typing">
            <i className="bi bi-robot"></i>
            <span className="vika-typing-name">ViKA</span>
            <span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        )}
      </div>

      <div className="vika-chat-input-area">
        <div className="vika-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="vika-chat-input"
            placeholder={t('chat.writeMessage', 'Mesajınızı yazın...')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            className={`vika-chat-btn ${inputText.trim() ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
