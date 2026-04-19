import { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, ListGroup, Form, Button, Spinner, Badge } from 'react-bootstrap';
import { chatApi } from '../api/chatApi';
import { useSignalR } from '../hooks/useSignalR';
import { useAuth } from '../hooks/useAuth';

export default function Chat() {
  const { user } = useAuth();
  const [raeume, setRaeume] = useState([]);
  const [activeRaum, setActiveRaum] = useState(null);
  const [nachrichten, setNachrichten] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef(null);

  // SignalR
  const { invoke, connected } = useSignalR('/hubs/chat', {
    onReceive: {
      ReceiveMessage: (message) => {
        if (message.raumId === activeRaum?.id) {
          setNachrichten((prev) => [...prev, message]);
        }
      },
      UserTyping: () => { /* typing indicator */ },
    },
  });

  // Load rooms
  useEffect(() => {
    chatApi.getRaeume()
      .then((res) => setRaeume(res.data))
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, []);

  // Load messages when room changes
  useEffect(() => {
    if (!activeRaum) return;
    setLoadingMsgs(true);
    chatApi.getNachrichten(activeRaum.id)
      .then((res) => setNachrichten(res.data.items || res.data))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));

    // Join SignalR room
    if (connected) {
      invoke('JoinRoom', activeRaum.id.toString());
    }
  }, [activeRaum, connected]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nachrichten]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeRaum) return;
    try {
      await invoke('SendMessage', activeRaum.id.toString(), newMsg);
      setNewMsg('');
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  return (
    <Container fluid className="py-4" style={{ height: 'calc(100vh - 72px)' }}>
      <Row className="h-100">
        {/* Room list */}
        <Col md={3} className="border-end pe-0">
          <h5 className="px-3 mb-3">
            Chat-Räume
            {connected && <Badge bg="success" className="ms-2 small">Online</Badge>}
          </h5>
          {loadingRooms ? <Spinner className="ms-3" /> : (
            <ListGroup variant="flush">
              {raeume.map((r) => (
                <ListGroup.Item
                  key={r.id}
                  action
                  active={activeRaum?.id === r.id}
                  onClick={() => setActiveRaum(r)}
                  className="d-flex justify-content-between"
                >
                  <span>💬 {r.name}</span>
                </ListGroup.Item>
              ))}
              {raeume.length === 0 && (
                <ListGroup.Item className="text-muted">Keine Räume</ListGroup.Item>
              )}
            </ListGroup>
          )}
        </Col>

        {/* Messages */}
        <Col md={9} className="d-flex flex-column ps-0">
          {!activeRaum ? (
            <div className="d-flex align-items-center justify-content-center flex-grow-1 text-muted">
              Wählen Sie einen Chat-Raum
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-bottom bg-light">
                <strong>{activeRaum.name}</strong>
              </div>

              <div className="flex-grow-1 overflow-auto px-3 py-2"
                style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {loadingMsgs ? <Spinner /> : (
                  <>
                    {nachrichten.map((n, i) => {
                      const isOwn = n.absenderId === user?.id;
                      return (
                        <div key={i} className={`mb-2 d-flex ${isOwn ? 'justify-content-end' : ''}`}>
                          <div className={`p-2 rounded-3 ${isOwn ? 'bg-primary text-white' : 'bg-light'}`}
                            style={{ maxWidth: '70%' }}>
                            {!isOwn && <small className="fw-bold d-block">{n.absenderName || 'Benutzer'}</small>}
                            <div>{n.inhalt}</div>
                            <small className={`d-block ${isOwn ? 'text-white-50' : 'text-muted'}`}>
                              {n.geschicktAm?.slice(11, 16)}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="p-3 border-top">
                <div className="d-flex gap-2">
                  <Form.Control
                    placeholder="Nachricht schreiben..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage} disabled={!connected}>Senden</Button>
                </div>
              </div>
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}
