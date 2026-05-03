import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useVikaChat } from '../../../hooks/useVikaChat';
import { useLanguage } from '../../../hooks/useLanguage';
import '../../../styles/VikaChat.css';

export default function VikaChat() {
  const [inputText, setInputText] = useState('');
  const { messages, isTyping, sendMessage, connected, status } = useVikaChat();
  const { t } = useLanguage();
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

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
            <h3 className="vika-title">ViKA</h3>
            <p className="text-muted vika-subtitle">AI Service Assistant</p>
            <span className="vika-subtitle">
              {status === 'connected' ? t('common.online', 'Çevrimiçi') : status === 'connecting' ? t('common.loading', 'Bağlanıyor...') : t('common.offline', 'Çevrimdışı')}
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
            {msg.role === 'user' ? (
              <div>{msg.content}</div>
            ) : (
              <div className="vika-markdown-body">
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
            <span>{t('chat.vikaTyping', 'VIKA yazıyor')}</span>
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
