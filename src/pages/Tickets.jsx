import { useEffect, useState, useCallback } from 'react';
import { Container, Button, Modal, Form, Alert, Spinner, ListGroup } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import { ticketApi } from '../api/ticketApi';

const statusOptions = ['Offen', 'InBearbeitung', 'Geloest', 'Geschlossen'];
const prioritaetOptions = ['Niedrig', 'Mittel', 'Hoch', 'Kritisch'];

export default function Tickets() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [error, setError] = useState('');
  const size = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketApi.getAll(page, size, search);
      setData(res.data.items || res.data);
      setTotal(res.data.totalCount || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData) => {
    setError('');
    try {
      if (editItem) {
        await ticketApi.update(editItem.id, formData);
      } else {
        await ticketApi.create(formData);
      }
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Speichern.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Wirklich löschen?')) return;
    try { await ticketApi.delete(id); load(); } catch { /* ignore */ }
  };

  const columns = [
    { key: 'titel', label: 'Titel' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'prioritaet', label: 'Priorität', render: (r) => <StatusBadge value={r.prioritaet} /> },
    { key: 'kategorie', label: 'Kategorie' },
    { key: 'faelligkeitsdatum', label: 'Fällig', render: (r) => r.faelligkeitsdatum?.slice(0, 10) || '—' },
    {
      key: 'actions', label: 'Aktionen',
      render: (row) => (
        <>
          <Button size="sm" variant="outline-info" className="me-1"
            onClick={() => setShowDetail(row)}>👁️</Button>
          <Button size="sm" variant="outline-primary" className="me-1"
            onClick={() => { setEditItem(row); setShowModal(true); }}>✏️</Button>
          <Button size="sm" variant="outline-danger" onClick={() => handleDelete(row.id)}>🗑️</Button>
        </>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Tickets</h2>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>+ Neues Ticket</Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner /></div>
      ) : (
        <DataTable columns={columns} data={data} totalCount={total}
          page={page} size={size} onPageChange={setPage} onSearch={setSearch}
          searchPlaceholder="Ticket suchen..." />
      )}

      <TicketModal show={showModal}
        onHide={() => { setShowModal(false); setEditItem(null); setError(''); }}
        onSave={handleSave} initial={editItem} error={error} />

      {showDetail && (
        <TicketDetail ticket={showDetail} onHide={() => setShowDetail(null)} />
      )}
    </Container>
  );
}

function TicketModal({ show, onHide, onSave, initial, error }) {
  const [form, setForm] = useState({
    titel: '', beschreibung: '', status: 'Offen', prioritaet: 'Mittel',
    kategorie: '', faelligkeitsdatum: '',
  });

  useEffect(() => {
    if (initial) {
      setForm({
        titel: initial.titel || '',
        beschreibung: initial.beschreibung || '',
        status: initial.status || 'Offen',
        prioritaet: initial.prioritaet || 'Mittel',
        kategorie: initial.kategorie || '',
        faelligkeitsdatum: initial.faelligkeitsdatum?.slice(0, 10) || '',
      });
    } else {
      setForm({ titel: '', beschreibung: '', status: 'Offen', prioritaet: 'Mittel',
        kategorie: '', faelligkeitsdatum: '' });
    }
  }, [initial, show]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? 'Ticket bearbeiten' : 'Neues Ticket'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            <div className="col-12">
              <Form.Label>Titel *</Form.Label>
              <Form.Control required value={form.titel}
                onChange={(e) => setForm({ ...form, titel: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>Beschreibung</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.beschreibung}
                onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} />
            </div>
            <div className="col-md-4">
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>Priorität</Form.Label>
              <Form.Select value={form.prioritaet}
                onChange={(e) => setForm({ ...form, prioritaet: e.target.value })}>
                {prioritaetOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>Kategorie</Form.Label>
              <Form.Control value={form.kategorie}
                onChange={(e) => setForm({ ...form, kategorie: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Fälligkeitsdatum</Form.Label>
              <Form.Control type="date" value={form.faelligkeitsdatum}
                onChange={(e) => setForm({ ...form, faelligkeitsdatum: e.target.value })} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Abbrechen</Button>
          <Button type="submit" variant="primary">Speichern</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function TicketDetail({ ticket, onHide }) {
  const [nachrichten, setNachrichten] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketApi.getNachrichten(ticket.id)
      .then((res) => setNachrichten(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticket.id]);

  const sendMsg = async () => {
    if (!newMsg.trim()) return;
    try {
      await ticketApi.addNachricht({ ticketId: ticket.id, inhalt: newMsg, istInternNotiz: false });
      setNewMsg('');
      const res = await ticketApi.getNachrichten(ticket.id);
      setNachrichten(res.data);
    } catch { /* ignore */ }
  };

  return (
    <Modal show onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {ticket.titel} <StatusBadge value={ticket.status} />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted">{ticket.beschreibung}</p>
        <hr />
        <h6>Nachrichten</h6>
        {loading ? <Spinner size="sm" /> : (
          <ListGroup className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {nachrichten.length === 0 && (
              <ListGroup.Item className="text-muted">Keine Nachrichten</ListGroup.Item>
            )}
            {nachrichten.map((n, i) => (
              <ListGroup.Item key={i} className={n.istInternNotiz ? 'bg-warning-subtle' : ''}>
                <small className="text-muted">{n.geschicktAm?.slice(0, 16)}</small>
                <div>{n.inhalt}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        <div className="d-flex gap-2">
          <Form.Control placeholder="Nachricht schreiben..." value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMsg()} />
          <Button onClick={sendMsg}>Senden</Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
