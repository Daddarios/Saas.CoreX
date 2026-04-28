import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Container, Form, Modal, Badge } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { abonnementApi } from '../api/abonnementApi';
import { useLanguage } from '../hooks/useLanguage';
import { ApiError } from '../api/errorHandler';
import { usePermission } from '../hooks/usePermission';

const statusColors = {
  Aktiv: 'success',
  Gekuendigt: 'danger',
  Pausiert: 'warning',
  Testphase: 'info',
};

export default function Abonnement() {
  const { t } = useLanguage();
  const { canEdit, canDelete, canCreate } = usePermission();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const size = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await abonnementApi.getAll(page, size);
      setData(res.data?.items || res.data || []);
      setTotal(res.data?.totalCount || 0);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Abonnements konnten nicht geladen werden.');
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData) => {
    setError('');
    try {
      if (editItem) {
        await abonnementApi.update(editItem.id, formData);
      } else {
        await abonnementApi.create(formData);
      }
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Speichern fehlgeschlagen.');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await abonnementApi.delete(deleteId);
      setDeleteId(null);
      load();
    } catch { /* ignore */ }
  };

  const columns = [
    { key: 'planName', label: 'Plan' },
    {
      key: 'status', label: 'Status',
      render: (r) => (
        <Badge bg={statusColors[r.status] || 'secondary'}>{r.status}</Badge>
      ),
    },
    { key: 'startdatum', label: 'Start', render: (r) => r.startdatum?.slice(0, 10) || '—' },
    { key: 'enddatum', label: 'Ende', render: (r) => r.enddatum?.slice(0, 10) || '—' },
    { key: 'preis', label: 'Preis', render: (r) => r.preis != null ? `€${r.preis.toFixed(2)}` : '—' },
    {
      key: 'actions', label: t('common.actions'),
      render: (row) => (
        <div className="d-flex gap-1">
          {canEdit && (
            <Button size="sm" variant="outline-primary" className="rounded-2"
              onClick={() => { setEditItem(row); setShowModal(true); }}>
              <i className="bi bi-pencil" />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="outline-danger" className="rounded-2"
              onClick={() => setDeleteId(row.id)}>
              <i className="bi bi-trash" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2><i className="bi bi-credit-card me-2" />Abonnements</h2>
        {canCreate && (
          <Button className="rounded-3" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <i className="bi bi-plus-lg me-1" /> Neu
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <LoadingSpinner text="Abonnements werden geladen..." />
      ) : (
        <DataTable columns={columns} data={data} totalCount={total}
          page={page} size={size} onPageChange={setPage} />
      )}

      <AbonnementModal
        show={showModal}
        onHide={() => { setShowModal(false); setEditItem(null); setError(''); }}
        onSave={handleSave}
        initial={editItem}
        error={error}
      />

      <ConfirmDialog
        show={!!deleteId}
        title="Abonnement löschen"
        message="Möchten Sie dieses Abonnement wirklich löschen?"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}

function AbonnementModal({ show, onHide, onSave, initial, error }) {
  const { t } = useLanguage();
  const [plaene, setPlaene] = useState([]);
  const [form, setForm] = useState({
    planName: '', status: 'Aktiv', startdatum: '', enddatum: '', preis: '',
  });

  useEffect(() => {
    if (show) {
      abonnementApi.getPlaene()
        .then((res) => setPlaene(res.data || []))
        .catch(() => {});
    }
  }, [show]);

  useEffect(() => {
    if (initial) {
      setForm({
        planName: initial.planName || '',
        status: initial.status || 'Aktiv',
        startdatum: initial.startdatum?.slice(0, 10) || '',
        enddatum: initial.enddatum?.slice(0, 10) || '',
        preis: initial.preis ?? '',
      });
    } else {
      setForm({ planName: '', status: 'Aktiv', startdatum: '', enddatum: '', preis: '' });
    }
  }, [initial, show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      preis: form.preis !== '' ? parseFloat(form.preis) : null,
      startdatum: form.startdatum || null,
      enddatum: form.enddatum || null,
    };
    onSave(payload);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? 'Abonnement bearbeiten' : 'Neues Abonnement'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            <div className="col-12">
              <Form.Label>Plan *</Form.Label>
              {plaene.length > 0 ? (
                <Form.Select required value={form.planName}
                  onChange={(e) => setForm({ ...form, planName: e.target.value })}>
                  <option value="">Bitte auswählen...</option>
                  {plaene.map((p, i) => (
                    <option key={i} value={p.name || p}>{p.name || p}</option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control required value={form.planName} placeholder="z.B. Basic, Pro, Enterprise"
                  onChange={(e) => setForm({ ...form, planName: e.target.value })} />
              )}
            </div>
            <div className="col-md-6">
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Aktiv">Aktiv</option>
                <option value="Testphase">Testphase</option>
                <option value="Pausiert">Pausiert</option>
                <option value="Gekuendigt">Gekündigt</option>
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>Preis (€)</Form.Label>
              <Form.Control type="number" step="0.01" min="0" value={form.preis}
                onChange={(e) => setForm({ ...form, preis: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Startdatum</Form.Label>
              <Form.Control type="date" value={form.startdatum}
                onChange={(e) => setForm({ ...form, startdatum: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Enddatum</Form.Label>
              <Form.Control type="date" value={form.enddatum}
                onChange={(e) => setForm({ ...form, enddatum: e.target.value })} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" className="rounded-2" onClick={onHide}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" className="rounded-2">{t('common.save')}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
