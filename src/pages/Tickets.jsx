import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Button,
  Container,
  Form,
  ListGroup,
  Modal,
  Spinner,
  Toast,
  ToastContainer,
} from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { ticketApi } from '../api/ticketApi';
import { kundeApi } from '../api/kundeApi';
import { projektApi } from '../api/projektApi';
import { benutzerApi } from '../api/benutzerApi';
import { useSignalR } from '../hooks/useSignalR';
import { useLanguage } from '../hooks/useLanguage';
import { parseApiError, ApiError } from '../api/errorHandler';
import { usePermission } from '../hooks/usePermission';

const statusOptions = ['Offen', 'InBearbeitung', 'Geloest', 'Geschlossen'];
const prioritaetOptions = ['Niedrig', 'Mittel', 'Hoch', 'Kritisch'];

export default function Tickets() {
  const { t } = useLanguage();
  const { canEdit, canDelete, canCreate } = usePermission(); // NurLesen için butonlar gizlenir
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState({ show: false, text: '' });
  const [error, setError] = useState('');
  const size = 20;

  const showToast = (text) => setToast({ show: true, text });

  useSignalR('/hubs/benachrichtigung', {
    onReceive: {
      TicketUpdated: () => {
        load();
        showToast(t('tickets.updated'));
      },
      NewNotification: (msg) => {
        showToast(msg?.titel || msg?.inhalt || t('tickets.newNotification'));
      },
    },
  });

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
    // Boş string'leri null'a çevir — backend validation hatasını önler
    const payload = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v]),
    );
    try {
      if (editItem) {
        await ticketApi.update(editItem.id, payload);
      } else {
        await ticketApi.create(payload);
      }
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      const apiErr = parseApiError(err);
      setError(apiErr.getLocalizedMessage(t));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await ticketApi.delete(deleteId);
      setDeleteId(null);
      load();
    } catch { /* ignore */ }
  };

  const changeStatus = async (id, status) => {
    try {
      await ticketApi.updateStatus(id, status);
      load();
      showToast(`Status: ${status}`);
    } catch {
      showToast(t('tickets.statusFailed'));
    }
  };

  const columns = [
    { key: 'titel', label: t('common.title') },
    { key: 'status', label: t('common.status'), render: (r) => <StatusBadge value={r.status} /> },
    { key: 'prioritaet', label: t('common.priority'), render: (r) => <StatusBadge value={r.prioritaet} /> },
    { key: 'kategorie', label: t('common.category') },
    { key: 'faelligkeitsdatum', label: t('tickets.dueDate'), render: (r) => r.faelligkeitsdatum?.slice(0, 10) || '—' },
    { key: 'zugewiesenAnName', label: 'Zugewiesen', render: (r) => r.zugewiesenAnName || '—' },
    {
      key: 'actions', label: t('common.actions'),
      render: (row) => (
        <>
          <Button size="sm" variant="outline-info" className="me-1"
            onClick={() => setShowDetail(row)}><i className="bi bi-eye" /></Button>
          {canEdit && <Button size="sm" variant="outline-primary" className="me-1"
            onClick={() => { setEditItem(row); setShowModal(true); }}><i className="bi bi-pencil" /></Button>}
          {canDelete && <Button size="sm" variant="outline-danger" className="me-1" onClick={() => setDeleteId(row.id)}><i className="bi bi-trash" /></Button>}
          <select
            className="form-select form-select-sm d-inline-block"
            style={{ width: 'auto' }}
            value={row.status}
            onChange={(e) => changeStatus(row.id, e.target.value)}
          >
            {statusOptions.map((s) => <option key={s} value={s}>{t(`status.${s}`, s)}</option>)}
          </select>
        </>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{t('tickets.title')}</h2>
        {canCreate && <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1" /> {t('tickets.new')}
        </Button>}
      </div>

      {loading ? (
        <LoadingSpinner text={t('tickets.loading')} />
      ) : (
        <DataTable columns={columns} data={data} totalCount={total}
          page={page} size={size} onPageChange={setPage} onSearch={setSearch}
          searchPlaceholder={t('tickets.search')} />
      )}

      <TicketModal show={showModal}
        onHide={() => { setShowModal(false); setEditItem(null); setError(''); }}
        onSave={handleSave} initial={editItem} error={error} />

      {showDetail && (
        <TicketDetail ticket={showDetail} onHide={() => setShowDetail(null)} />
      )}

      <ConfirmDialog
        show={!!deleteId}
        title={t('tickets.deleteTitle')}
        message={t('tickets.deleteMessage')}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />

      <ToastContainer position="bottom-end" className="p-3">
        <Toast delay={2500} autohide show={toast.show} onClose={() => setToast({ show: false, text: '' })}>
          <Toast.Header>
            <strong className="me-auto">{t('tickets.newNotification')}</strong>
          </Toast.Header>
          <Toast.Body>{toast.text}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
}

function TicketModal({ show, onHide, onSave, initial, error }) {
  const { t } = useLanguage();
  const [kunden, setKunden] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [benutzer, setBenutzer] = useState([]);
  const [form, setForm] = useState({
    titel: '', beschreibung: '', status: 'Offen', prioritaet: 'Mittel',
    kategorie: '', faelligkeitsdatum: '', kundeId: '', projektId: '', zugewiesenAnId: '',
  });

  // Dropdown listelerini yükle
  useEffect(() => {
    if (show) {
      kundeApi.getAll(1, 200).then((res) => {
        setKunden(res.data?.items || res.data || []);
      }).catch(() => {});
      projektApi.getAll(1, 200).then((res) => {
        setProjekte(res.data?.items || res.data || []);
      }).catch(() => {});
      benutzerApi.getAll(1, 200).then((res) => {
        setBenutzer(res.data?.items || res.data || []);
      }).catch(() => {});
    }
  }, [show]);

  useEffect(() => {
    if (initial) {
      setForm({
        titel: initial.titel || '',
        beschreibung: initial.beschreibung || '',
        status: initial.status || 'Offen',
        prioritaet: initial.prioritaet || 'Mittel',
        kategorie: initial.kategorie || '',
        faelligkeitsdatum: initial.faelligkeitsdatum?.slice(0, 10) || '',
        kundeId: initial.kundeId || '',
        projektId: initial.projektId || '',
        zugewiesenAnId: initial.zugewiesenAnId || '',
      });
    } else {
      setForm({ titel: '', beschreibung: '', status: 'Offen', prioritaet: 'Mittel',
        kategorie: '', faelligkeitsdatum: '', kundeId: '', projektId: '', zugewiesenAnId: '' });
    }
  }, [initial, show]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? t('tickets.editTitle') : t('tickets.newTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label>{t('kunden.title')} *</Form.Label>
              <Form.Select required value={form.kundeId}
                onChange={(e) => setForm({ ...form, kundeId: e.target.value })}>
                <option value="">{t('common.select')}...</option>
                {kunden.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.unternehmen} — {k.vorname} {k.nachname}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>{t('common.title')} *</Form.Label>
              <Form.Control required value={form.titel}
                onChange={(e) => setForm({ ...form, titel: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>{t('projekte.description')}</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.beschreibung}
                onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} />
            </div>
            <div className="col-md-4">
              <Form.Label>{t('common.status')}</Form.Label>
              <Form.Select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s} value={s}>{t(`status.${s}`, s)}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>{t('common.priority')}</Form.Label>
              <Form.Select value={form.prioritaet}
                onChange={(e) => setForm({ ...form, prioritaet: e.target.value })}>
                {prioritaetOptions.map((p) => <option key={p} value={p}>{t(`status.${p}`, p)}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>{t('common.category')}</Form.Label>
              <Form.Control value={form.kategorie}
                onChange={(e) => setForm({ ...form, kategorie: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('tickets.dueDate')}</Form.Label>
              <Form.Control type="date" value={form.faelligkeitsdatum}
                onChange={(e) => setForm({ ...form, faelligkeitsdatum: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Projekt</Form.Label>
              <Form.Select value={form.projektId}
                onChange={(e) => setForm({ ...form, projektId: e.target.value })}>
                <option value="">{t('common.select')}...</option>
                {projekte.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>Zugewiesen an</Form.Label>
              <Form.Select value={form.zugewiesenAnId}
                onChange={(e) => setForm({ ...form, zugewiesenAnId: e.target.value })}>
                <option value="">{t('common.select')}...</option>
                {benutzer.map((b) => (
                  <option key={b.id} value={b.id}>{b.vorname} {b.nachname}</option>
                ))}
              </Form.Select>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary">{t('common.save')}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function TicketDetail({ ticket, onHide }) {
  const { t } = useLanguage();
  const [nachrichten, setNachrichten] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [istInternNotiz, setIstInternNotiz] = useState(false);
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
      await ticketApi.addNachricht({ ticketId: ticket.id, inhalt: newMsg, istInternNotiz });
      setNewMsg('');
      setIstInternNotiz(false);
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
        <h6>{t('common.messages')}</h6>
        {loading ? <Spinner size="sm" /> : (
          <ListGroup className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {nachrichten.length === 0 && (
              <ListGroup.Item className="text-muted">{t('tickets.noMessages')}</ListGroup.Item>
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
          <Form.Control placeholder={t('tickets.writeMessage')} value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMsg()} />
          <Button onClick={sendMsg}>{t('common.send')}</Button>
        </div>
        <div className="mt-2">
          <Form.Check
            type="checkbox"
            id="intern-notiz-check"
            label={<span className="small text-warning fw-semibold"><i className="bi bi-lock me-1" />Interne Notiz</span>}
            checked={istInternNotiz}
            onChange={(e) => setIstInternNotiz(e.target.checked)}
          />
        </div>
      </Modal.Body>
    </Modal>
  );
}
