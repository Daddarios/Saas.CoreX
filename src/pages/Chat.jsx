import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Spinner, ButtonGroup } from 'react-bootstrap';
import { chatApi } from '../api/chatApi';
import { benutzerApi } from '../api/benutzerApi';
import { getAvatarUrl } from '../api/axiosClient';
import { useSignalR } from '../hooks/useSignalR';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import axiosClient from '../api/axiosClient';
import '../styles/Chat.css';

const initials = (text = '') =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso.slice(11, 16);
  }
};

const fullName = (u) => [u?.vorname, u?.nachname].filter(Boolean).join(' ').trim();
const bytesToMb = (bytes) => {
  const num = Number(bytes || 0);
  if (!Number.isFinite(num) || num <= 0) return '0.0 MB';
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};
const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString([], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const getExtension = (fileName = '') => {
  const parts = String(fileName).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};
const isImageFile = (file) => {
  const type = String(file?.dateiTyp || '').toLowerCase();
  const ext = getExtension(file?.dateiName);
  if (type.startsWith('image/')) return true;
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
};
const getFileIconClass = (file) => {
  const type = String(file?.dateiTyp || '').toLowerCase();
  const ext = getExtension(file?.dateiName);
  if (type.includes('pdf') || ext === 'pdf') return 'bi-file-earmark-pdf';
  if (type.includes('word') || ['doc', 'docx'].includes(ext)) return 'bi-file-earmark-word';
  if (type.includes('excel') || type.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'bi-file-earmark-excel';
  if (type.includes('video') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'bi-file-earmark-play';
  if (type.includes('zip') || ['zip', 'rar', '7z'].includes(ext)) return 'bi-file-earmark-zip';
  if (type.includes('text') || ['txt', 'md', 'json', 'xml'].includes(ext)) return 'bi-file-earmark-text';
  return 'bi-file-earmark';
};

// Other participants (excluding current user)
const getOtherTeilnehmer = (room, currentUserId) => {
  if (!Array.isArray(room?.teilnehmer)) return [];
  return room.teilnehmer.filter((p) => p?.id !== currentUserId);
};
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮'];
const isEndpointUnsupported = (err) => {
  const status = err?.response?.status;
  return status === 404 || status === 405 || status === 501;
};

export default function Chat() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('raeume'); // 'raeume' | 'users'
  const [allUsers, setAllUsers] = useState([]);
  const [raeume, setRaeume] = useState([]);
  const [activeRaum, setActiveRaum] = useState(null);
  const [nachrichten, setNachrichten] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [reactionPickerForId, setReactionPickerForId] = useState(null);
  const [actionMenuForId, setActionMenuForId] = useState(null);
  const [raumIdForFile, setRaumIdForFile] = useState(null);
  
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  
  // Room presence
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  // Global presence
  const [globalOnlineUserIds, setGlobalOnlineUserIds] = useState(() => new Set());
  
  const [typingUserIds, setTypingUserIds] = useState(() => new Set());
  const typingTimersRef = useRef(new Map());

  const messagesEndRef = useRef(null);
  const activeRaumIdRef = useRef(null);
  useEffect(() => {
    activeRaumIdRef.current = activeRaum?.id ?? null;
  }, [activeRaum]);

  const currentUserIdRef = useRef(null);
  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user]);

  const onReceive = useMemo(
    () => ({
      ReceiveMessage: (message) => {
        if (message.raumId !== activeRaumIdRef.current) return;
        setNachrichten((prev) => {
          if (message.id && prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      },
      OnlineUsers: (ids) => {
        console.log('[Chat] OnlineUsers event:', ids, 'type:', typeof ids);
        const normalizedIds = Array.isArray(ids) ? ids.map(String).map(id => id.toLowerCase()) : [];
        console.log('[Chat] Normalized IDs:', normalizedIds);
        setOnlineUserIds(new Set(normalizedIds));
      },
      UserJoined: (userId) => {
        if (!userId) return;
        const uid = String(userId).toLowerCase();
        console.log('[Chat] UserJoined:', uid);
        setOnlineUserIds((prev) => {
          if (prev.has(uid)) return prev;
          const next = new Set(prev);
          next.add(uid);
          return next;
        });
      },
      UserLeft: (userId) => {
        if (!userId) return;
        setOnlineUserIds((prev) => {
          if (!prev.has(userId)) return prev;
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      },
      GlobalUserOnlineStatus: (payload) => {
        if (!payload || !payload.userId) return;
        const uid = String(payload.userId).toLowerCase();
        console.log('[Chat] GlobalUserOnlineStatus:', payload, '->', uid);
        setGlobalOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (payload.isOnline) {
            next.add(uid);
            console.log('[Chat] User online:', uid);
          } else {
            next.delete(uid);
            console.log('[Chat] User offline:', uid);
          }
          return next;
        });
      },
      UserTyping: (payload) => {
        if (!payload) return;
        const { userId, raumId } = payload;
        if (!userId || raumId !== activeRaumIdRef.current) return;
        if (userId === currentUserIdRef.current) return;

        setTypingUserIds((prev) => {
          if (prev.has(userId)) return prev;
          const next = new Set(prev);
          next.add(userId);
          return next;
        });

        const existing = typingTimersRef.current.get(userId);
        if (existing) clearTimeout(existing);
        const tid = setTimeout(() => {
          typingTimersRef.current.delete(userId);
          setTypingUserIds((prev) => {
            if (!prev.has(userId)) return prev;
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }, 3000);
        typingTimersRef.current.set(userId, tid);
      },
    }),
    []
  );

  const { invoke, connected, status, reconnect, reconnectAttempt } = useSignalR('/hubs/chat', {
    onReceive,
  });

  // Get global online users on connect
  useEffect(() => {
    if (connected) {
      invoke('GetOnlineUsers').then(ids => {
        if (Array.isArray(ids)) {
          setGlobalOnlineUserIds(new Set(ids.map(id => String(id).toLowerCase())));
        }
      }).catch(() => {});
    }
  }, [connected, invoke]);

  useEffect(() => {
    return () => {
      typingTimersRef.current.forEach((tid) => clearTimeout(tid));
      typingTimersRef.current.clear();
    };
  }, []);

  // Initial Data Load
  useEffect(() => {
    chatApi
      .getRaeume()
      .then((res) => {
        const list = res.data || [];
        setRaeume(list);
        if (list.length > 0) setActiveRaum((prev) => prev || list[0]);
      })
      .catch((err) => setError(err.response?.data?.message || t('chat.loadError')))
      .finally(() => setLoadingRooms(false));

    benutzerApi
      .getAll(1, 1000)
      .then((res) => {
        const list = res.data || [];
        setAllUsers(list.filter(u => u.id !== user?.id));
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const startDirectChat = async (zielUserId) => {
    try {
      const res = await chatApi.getOrCreateDirektChat(zielUserId);
      const raumId = res.data.id;
      // Odaları yenile
      const roomsRes = await chatApi.getRaeume();
      setRaeume(roomsRes.data || []);
      const newActive = (roomsRes.data || []).find(r => r.id === raumId);
      if (newActive) {
        setActiveRaum(newActive);
        setActiveTab('raeume');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const previousRoomIdRef = useRef(null);
  useEffect(() => {
    if (!activeRaum) return;
    setLoadingMsgs(true);
    setSendError('');
    chatApi
      .getNachrichten(activeRaum.id)
      .then((res) => {
        // Backend returns { total, page, size, items } — items already ASC chronological
        const items = res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
        setNachrichten(items);
      })
      .catch(() => setNachrichten([]))
      .finally(() => setLoadingMsgs(false));

    // Reset per-room state on room switch
    setOnlineUserIds(new Set());
    setTypingUserIds(new Set());
    typingTimersRef.current.forEach((tid) => clearTimeout(tid));
    typingTimersRef.current.clear();

    if (connected) {
      const prevId = previousRoomIdRef.current;
      if (prevId && prevId !== activeRaum.id) {
        invoke('LeaveRoom', prevId.toString()).catch(() => {});
      }
      invoke('JoinRoom', activeRaum.id.toString()).catch(() => {});
      previousRoomIdRef.current = activeRaum.id;
    }
    // `invoke` reads from a ref inside useSignalR; safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRaum, connected]);

  // Auto-scroll to bottom on new messages or typing indicator
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nachrichten, typingUserIds]);

  // Throttle Typing invocations — at most once per 2s
  const lastTypingSentRef = useRef(0);
  const handleInputChange = (e) => {
    setNewMsg(e.target.value);
    if (!connected || !activeRaum) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      invoke('Typing', activeRaum.id.toString()).catch(() => {});
    }
  };

  const sendMessage = async () => {
    const trimmed = newMsg.trim();
    if (!trimmed || !activeRaum || !connected) return;
    if (trimmed.length > 4000) {
      setSendError(t('chat.tooLong', 'Message is too long (max 4000 chars).'));
      return;
    }
    try {
      await invoke('SendMessage', activeRaum.id.toString(), trimmed);
      setNewMsg('');
      setSendError('');
      // Server will broadcast ReceiveMessage back to us
    } catch (err) {
      setSendError(err?.message || t('chat.loadError'));
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !raumIdForFile || !connected) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSendError(t('chat.fileTooLarge', 'File size must be less than 100MB'));
      return;
    }
    const formData = new FormData();
    formData.append('datei', file);
    try {
      await axiosClient.post(`/chat/raum/${raumIdForFile}/datei`, formData);
      setSendError('');
    } catch (err) {
      setSendError(err.response?.data?.message || t('chat.fileUploadError', 'File upload failed'));
    }
  };

  const startEditMessage = (msg) => {
    if (!msg?.id || msg?.istDatei) return;
    setActionMenuForId(null);
    setEditingMessageId(msg.id);
    setEditText(msg.inhalt || '');
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const saveEditMessage = async (msg) => {
    const trimmed = editText.trim();
    if (!msg?.id || !trimmed) return;
    try {
      await chatApi.updateNachricht(msg.id, trimmed);
      setNachrichten((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, inhalt: trimmed, bearbeitet: true } : m))
      );
      cancelEditMessage();
      setSendError('');
    } catch (err) {
      if (isEndpointUnsupported(err)) {
        setNachrichten((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, inhalt: trimmed, bearbeitet: true } : m))
        );
        cancelEditMessage();
        setSendError(t('chat.editLocalOnly', 'Edit endpoint not available on server. Applied locally.'));
        return;
      }
      setSendError(err.response?.data?.message || t('chat.editError', 'Message update failed'));
    }
  };

  const deleteMessage = async (msg) => {
    if (!msg?.id) return;
    try {
      await chatApi.deleteNachricht(msg.id);
      setNachrichten((prev) => prev.filter((m) => m.id !== msg.id));
      setSendError('');
    } catch (err) {
      if (isEndpointUnsupported(err)) {
        setNachrichten((prev) => prev.filter((m) => m.id !== msg.id));
        setSendError(t('chat.deleteLocalOnly', 'Delete endpoint not available on server. Removed locally.'));
        return;
      }
      setSendError(err.response?.data?.message || t('chat.deleteError', 'Message delete failed'));
    }
  };

  const addReaction = async (msg, emoji) => {
    if (!msg?.id || !emoji) return;
    const applyReactionLocal = () => {
      setNachrichten((prev) =>
        prev.map((m) => {
          if (m.id !== msg.id) return m;
          const reactions = Array.isArray(m.reaksiyonlar) ? [...m.reaksiyonlar] : [];
          const idx = reactions.findIndex((r) => r.emoji === emoji);
          if (idx >= 0) {
            reactions[idx] = { ...reactions[idx], adet: (reactions[idx].adet || 0) + 1 };
          } else {
            reactions.push({ emoji, adet: 1 });
          }
          return { ...m, reaksiyonlar: reactions };
        })
      );
    };
    applyReactionLocal();
    try {
      await chatApi.addReaktion(msg.id, emoji);
      setReactionPickerForId(null);
      setActionMenuForId(null);
      setSendError('');
    } catch (err) {
      if (isEndpointUnsupported(err)) {
        setReactionPickerForId(null);
        setActionMenuForId(null);
        setSendError(t('chat.reactionLocalOnly', 'Reaction endpoint not available on server. Applied locally.'));
        return;
      }
      setReactionPickerForId(null);
      setActionMenuForId(null);
      setSendError(err.response?.data?.message || t('chat.reactionError', 'Reaction saved locally.'));
    }
  };

  const canSend = connected && !!activeRaum && newMsg.trim().length > 0;

  // Compute room display info — partner avatar/name for 1-1, room name otherwise
  const getRoomDisplay = (room) => {
    const others = getOtherTeilnehmer(room, user?.id);
    if (others.length === 1) {
      const p = others[0];
      return {
        title: fullName(p) || room.name,
        bild: p.bild,
        partnerId: p.id,
        isGroup: false,
      };
    }
    return {
      title: room.name,
      bild: null,
      partnerId: null,
      isGroup: others.length > 1,
    };
  };

  const activeDisplay = activeRaum ? getRoomDisplay(activeRaum) : null;

  useEffect(() => {
    setRaumIdForFile(activeRaum?.id ?? null);
  }, [activeRaum?.id]);

  // Names of users currently typing in active room
  const typingNames = useMemo(() => {
    if (!activeRaum || typingUserIds.size === 0) return [];
    const others = getOtherTeilnehmer(activeRaum, user?.id);
    return Array.from(typingUserIds)
      .map((id) => {
        const p = others.find((o) => o.id === id);
        return p ? fullName(p) || t('chat.user') : null;
      })
      .filter(Boolean);
  }, [activeRaum, typingUserIds, user?.id, t]);

  return (
    <div className={`chat-page m-0 m-md-3 ${isMobileChatOpen ? 'mobile-chat-open' : ''}`}>
      {/* Sidebar — rooms */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h5 className="chat-sidebar-title">
            <i className="bi bi-chat-dots me-2" />
            Chat
          </h5>
          <span className={`chat-status-pill ${status}`}>
            <span className="dot" />
            {status === 'connected' && t('common.online', 'Online')}
            {status === 'connecting' && t('common.connecting', 'Connecting')}
            {status === 'reconnecting' && `Reconnect ${reconnectAttempt || ''}`}
            {status === 'disconnected' && t('common.offline', 'Offline')}
          </span>
        </div>

        <div className="px-2 px-md-3 pb-2">
          <ButtonGroup className="w-100" size="sm">
            <Button
              variant={activeTab === 'raeume' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('raeume')}
            >
              {t('chat.tabs.rooms', 'Odalar')}
            </Button>
            <Button
              variant={activeTab === 'users' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('users')}
            >
              {t('chat.tabs.users', 'Kullanıcılar')}
            </Button>
          </ButtonGroup>
        </div>

        {status !== 'connected' && (
          <div className="chat-reconnect-row">
            <Button size="sm" variant="outline-secondary" onClick={reconnect}>
              <i className="bi bi-arrow-clockwise me-1" />
              {t('chat.connect')}
            </Button>
          </div>
        )}

        {error && <div className="chat-inline-error">{error}</div>}

        <div className="chat-room-list">
          {activeTab === 'raeume' && (
            loadingRooms ? (
              <div className="d-flex justify-content-center py-4">
                <Spinner size="sm" />
              </div>
            ) : raeume.length === 0 ? (
              <div className="chat-room-empty">{t('chat.noRooms')}</div>
            ) : (
              raeume.map((r) => {
                const d = getRoomDisplay(r);
                const isActive = activeRaum?.id === r.id;
                let isPartnerOnline = false;
                if (r.istDirektChat && d.partnerId) {
                  isPartnerOnline = globalOnlineUserIds.has(String(d.partnerId).toLowerCase());
                } else {
                  isPartnerOnline = isActive && d.partnerId && onlineUserIds.has(d.partnerId);
                }
                
                return (
                  <div
                    key={r.id}
                    className={`chat-room-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                        setActiveRaum(r);
                        setRaumIdForFile(r.id);
                        setIsMobileChatOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveRaum(r)}
                  >
                    <span className="chat-room-avatar-wrap">
                      {d.bild ? (
                        <img
                          className="chat-room-avatar chat-room-avatar-img"
                          src={getAvatarUrl(d.bild)}
                          alt={d.title}
                        />
                      ) : (
                        <span className="chat-room-avatar">
                          {d.isGroup ? <i className="bi bi-people-fill" /> : initials(d.title)}
                        </span>
                      )}
                      <span className={`chat-presence-dot ${isPartnerOnline ? 'online' : 'offline'}`} />
                    </span>
                    <span className="chat-room-name">{d.title}</span>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'users' && (
            loadingUsers ? (
              <div className="d-flex justify-content-center py-4">
                <Spinner size="sm" />
              </div>
            ) : allUsers.length === 0 ? (
              <div className="chat-room-empty">{t('chat.users.empty', 'Kullanıcı bulunamadı')}</div>
            ) : (
              allUsers.map((u) => {
                const isOnline = globalOnlineUserIds.has(String(u.id).toLowerCase());
                const title = fullName(u);
                return (
                  <div
                    key={u.id}
                    className="chat-room-item"
                    onClick={() => {
                        startDirectChat(u.id);
                        setRaumIdForFile(null);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && startDirectChat(u.id)}
                  >
                    <span className="chat-room-avatar-wrap">
                      {u.bild ? (
                        <img
                          className="chat-room-avatar chat-room-avatar-img"
                          src={getAvatarUrl(u.bild)}
                          alt={title}
                        />
                      ) : (
                        <span className="chat-room-avatar">
                          {initials(title)}
                        </span>
                      )}
                      <span className={`chat-presence-dot ${isOnline ? 'online' : 'offline'}`} />
                    </span>
                    <span className="chat-room-name">{title}</span>
                  </div>
                );
              })
            )
          )}
        </div>
      </aside>

      {/* Main */}
      <section className="chat-main">
        {!activeRaum || !activeDisplay ? (
          <div className="chat-empty">
            <i className="bi bi-chat-square-text" />
            <div>{t('chat.chooseRoom')}</div>
          </div>
        ) : (
          <>
            <div className="chat-main-header">
              <button className="chat-back-btn d-lg-none me-2" onClick={() => setIsMobileChatOpen(false)}>
                <i className="bi bi-arrow-left" />
              </button>
              <span className="chat-room-avatar-wrap">
                {activeDisplay.bild ? (
                  <img
                    className="chat-room-avatar chat-room-avatar-img"
                    src={getAvatarUrl(activeDisplay.bild)}
                    alt={activeDisplay.title}
                  />
                ) : (
                  <span className="chat-room-avatar">
                    {activeDisplay.isGroup ? (
                      <i className="bi bi-people-fill" />
                    ) : (
                      initials(activeDisplay.title)
                    )}
                  </span>
                )}
                {activeDisplay.partnerId && globalOnlineUserIds.has(String(activeDisplay.partnerId).toLowerCase()) && (
                  <span className="chat-presence-dot online" />
                )}
              </span>
              <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                <strong className="text-truncate">{activeDisplay.title}</strong>
                {(() => {
                  // 1-1 → partner online/offline
                  if (activeDisplay.partnerId) {
                    const on = globalOnlineUserIds.has(String(activeDisplay.partnerId).toLowerCase());
                    return (
                      <span className={`chat-room-status ${on ? 'online' : 'offline'}`}>
                        {on ? t('common.online', 'Online') : t('common.offline', 'Offline')}
                      </span>
                    );
                  }
                  // Group → count of other online users
                  let othersOnline = 0;
                  globalOnlineUserIds.forEach((id) => {
                    if (id !== String(user?.id).toLowerCase()) othersOnline += 1;
                  });
                  if (othersOnline > 0) {
                    return (
                      <span className="chat-room-status online">
                        {othersOnline}{' '}
                        {t(
                          othersOnline === 1 ? 'chat.oneOnline' : 'chat.manyOnline',
                          othersOnline === 1 ? 'user online' : 'users online'
                        )}
                      </span>
                    );
                  }
                  return (
                    <span className="chat-room-status offline">
                      {t('chat.noOthersOnline', 'No one else online yet')}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="chat-body">
              {loadingMsgs ? (
                <div className="d-flex justify-content-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : nachrichten.length === 0 && typingNames.length === 0 ? (
                <div className="chat-empty">
                  <i className="bi bi-inbox" />
                  <div>{t('chat.noMessages', 'No messages yet')}</div>
                </div>
              ) : (
                <>
                  {nachrichten.map((n, i) => {
                    const isOwn = n.absenderId === user?.id;
                    const senderName =
                      fullName(n.absender) || n.absenderName || t('chat.user');
                    const bild = isOwn ? user?.bild : n.absender?.bild;
                    const isEditing = editingMessageId === n.id;
                    const reactions = Array.isArray(n.reaksiyonlar) ? n.reaksiyonlar : [];
                    return (
                      <div key={n.id ?? i} className={`chat-msg-row ${isOwn ? 'own' : ''}`}>
                        {!isOwn && (
                          <span className="chat-msg-avatar-wrap">
                            {bild ? (
                              <img
                                className="chat-msg-avatar chat-msg-avatar-img"
                                src={getAvatarUrl(bild)}
                                alt={senderName}
                              />
                            ) : (
                              <span className="chat-msg-avatar">{initials(senderName)}</span>
                            )}
                          </span>
                        )}
                        <div className="chat-bubble">
                          <span className="chat-bubble-author">
                            {isOwn ? (fullName(user) || user?.email || t('chat.user')) : senderName}
                          </span>
                          {isEditing ? (
                            <div className="chat-edit-wrap">
                              <input
                                className="chat-edit-input"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                maxLength={4000}
                              />
                              <div className="chat-edit-actions">
                                <button type="button" className="chat-msg-action-btn" onClick={() => saveEditMessage(n)}>
                                  <i className="bi bi-check2" />
                                </button>
                                <button type="button" className="chat-msg-action-btn" onClick={cancelEditMessage}>
                                  <i className="bi bi-x-lg" />
                                </button>
                              </div>
                            </div>
                          ) : n.istDatei ? (
                            <div className="chat-file-msg">
                              {isImageFile(n) ? (
                                <>
                                  <a className="chat-file-link chat-file-link-image" href={getAvatarUrl(n.dateiPfad)} download={n.dateiName} target="_blank" rel="noopener noreferrer">
                                    <img
                                      className="chat-file-image"
                                      src={getAvatarUrl(n.dateiPfad)}
                                      alt={n.dateiName}
                                    />
                                    <span className="chat-file-meta">{n.dateiName} · {bytesToMb(n.dateiGroesse)}</span>
                                  </a>
                                  <a
                                    className="chat-file-download-btn"
                                    href={getAvatarUrl(n.dateiPfad)}
                                    download={n.dateiName}
                                    title={t('common.download', 'Download')}
                                  >
                                    <i className="bi bi-download" />
                                  </a>
                                </>
                              ) : (
                                <>
                                  <a className="chat-file-link chat-file-link-doc" href={getAvatarUrl(n.dateiPfad)} download={n.dateiName} target="_blank" rel="noopener noreferrer">
                                    <i className={`bi ${getFileIconClass(n)} chat-file-icon`} />
                                    <span className="chat-file-meta">{n.dateiName} · {bytesToMb(n.dateiGroesse)}</span>
                                  </a>
                                  <a
                                    className="chat-file-download-btn"
                                    href={getAvatarUrl(n.dateiPfad)}
                                    download={n.dateiName}
                                    title={t('common.download', 'Download')}
                                  >
                                    <i className="bi bi-download" />
                                  </a>
                                </>
                              )}
                            </div>
                          ) : (
                            <div>{n.inhalt}</div>
                          )}
                          {!n.istDatei && reactions.length > 0 && (
                            <div className="chat-reactions-row">
                              {reactions.map((r, idx) => (
                                <span key={`${r.emoji}-${idx}`} className="chat-reaction-pill">
                                  {r.emoji} {r.adet || r.count || 1}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="chat-msg-actions">
                            <button
                              type="button"
                              className="chat-msg-action-btn"
                              title={t('common.actions', 'Actions')}
                              onClick={() => {
                                setActionMenuForId((prev) => (prev === n.id ? null : n.id));
                                setReactionPickerForId(null);
                              }}
                            >
                              <i className="bi bi-three-dots" />
                            </button>
                          </div>
                          {actionMenuForId === n.id && (
                            <div className="chat-msg-actions-menu">
                              {isOwn && !n.istDatei && !isEditing && (
                                <button
                                  type="button"
                                  className="chat-msg-action-item"
                                  onClick={() => startEditMessage(n)}
                                >
                                  <i className="bi bi-pencil-square" />
                                  {t('common.edit', 'Edit')}
                                </button>
                              )}
                              {isOwn && (
                                <button
                                  type="button"
                                  className="chat-msg-action-item danger"
                                  onClick={() => deleteMessage(n)}
                                >
                                  <i className="bi bi-trash3" />
                                  {t('common.delete', 'Delete')}
                                </button>
                              )}
                              <button
                                type="button"
                                className="chat-msg-action-item"
                                onClick={() => addReaction(n, '👍')}
                              >
                                <i className="bi bi-hand-thumbs-up" />
                                {t('chat.like', 'Like')}
                              </button>
                              <button
                                type="button"
                                className="chat-msg-action-item"
                                onClick={() => setReactionPickerForId((prev) => (prev === n.id ? null : n.id))}
                              >
                                <i className="bi bi-emoji-smile" />
                                {t('chat.reaction', 'Reaction')}
                              </button>
                              {reactionPickerForId === n.id && (
                                <div className="chat-emoji-picker">
                                  {QUICK_REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      className="chat-emoji-btn"
                                      onClick={() => addReaction(n, emoji)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          <span className="chat-bubble-time">{formatDateTime(n.geschicktAm)}</span>
                        </div>
                        {isOwn && (
                          <span className="chat-msg-avatar-wrap chat-msg-avatar-wrap-own">
                            {bild ? (
                              <img
                                className="chat-msg-avatar chat-msg-avatar-img"
                                src={getAvatarUrl(bild)}
                                alt={fullName(user) || user?.email || t('chat.user')}
                              />
                            ) : (
                              <span className="chat-msg-avatar">{initials(fullName(user) || user?.email || t('chat.user'))}</span>
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {typingNames.length > 0 && (
                    <div className="chat-typing-row">
                      <span className="chat-typing-bubble">
                        <span className="chat-typing-dots">
                          <span /><span /><span />
                        </span>
                        <span className="chat-typing-text">
                          {typingNames.length === 1
                            ? `${typingNames[0]} ${t('chat.isTyping', 'is typing…')}`
                            : `${typingNames.length} ${t('chat.areTyping', 'people typing…')}`}
                        </span>
                      </span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="chat-input-area">
              {sendError && <div className="chat-inline-error mb-2">{sendError}</div>}
              <div className="chat-input-wrapper">
                <input
                  className="chat-input"
                  placeholder={t('chat.writeMessage')}
                  value={newMsg}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={!connected}
                  maxLength={4000}
                />
                <button
                  type="button"
                  className={`chat-send-btn ${canSend ? 'active' : ''}`}
                  onClick={sendMessage}
                  disabled={!canSend}
                  aria-label={t('common.send', 'Send')}
                >
                  <i className="bi bi-send-fill" />
                </button>
                {/* Dosya yükleme butonu */}
                {raumIdForFile && (
                  <div className="chat-file-upload-wrapper">
                    <input
                      type="file"
                      id="chat-file-input"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                      accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.doc,.docx,.zip,.rar,.txt"
                    />
                    <button
                      type="button"
                      className="chat-file-upload-btn"
                      onClick={() => document.getElementById('chat-file-input')?.click()}
                      title={t('chat.sendFile', 'Send file')}
                      disabled={!connected}
                    >
                      <i className="bi bi-paperclip" />
                    </button>
                  </div>
                )}
              </div>
              {!connected && (
                <div className="chat-input-hint">
                  <i className="bi bi-info-circle" />
                  {t('chat.disconnectedHint', 'Disconnected — reconnect to send messages.')}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
