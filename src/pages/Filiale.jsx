import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Container, Form, Modal } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { filialeApi } from '../api/filialeApi';
import { kundeApi } from '../api/kundeApi';
import { useLanguage } from '../hooks/useLanguage';
import { usePermission } from '../hooks/usePermission';

export default function Filiale() {
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
      const res = await filialeApi.getAll(page, size);
      setData(res.data?.items || res.data || []);
      setTotal(res.data?.totalCount || 0);
    } catch {
      setError('Filialen konnten nicht geladen werden. (Backend Controller fehlt möglicherweise)');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData) => {
    setError('');
    try {
      if (editItem) {
        await filialeApi.update(editItem.id, formData);
      } else {
        await filialeApi.create(formData);
      }
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Speichern fehlgeschlagen.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await filialeApi.delete(deleteId);
      setDeleteId(null);
      load();
    } catch { /* ignore */ }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'adresse', label: 'Adresse' },
    { key: 'telefon', label: 'Telefon' },
    { key: 'kundeName', label: 'Kunde' },
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
        <h2><i className="bi bi-building me-2" />Filialen</h2>
        {canCreate && (
          <Button className="rounded-3" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <i className="bi bi-plus-lg me-1" /> Neue Filiale
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <LoadingSpinner text="Filialen werden geladen..." />
      ) : (
        <DataTable columns={columns} data={data} totalCount={total}
          page={page} size={size} onPageChange={setPage} />
      )}

      <FilialeModal
        show={showModal}
        onHide={() => { setShowModal(false); setEditItem(null); setError(''); }}
        onSave={handleSave}
        initial={editItem}
        error={error}
      />

      <ConfirmDialog
        show={!!deleteId}
        title="Filiale löschen"
        message="Möchten Sie diese Filiale wirklich löschen?"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}

function FilialeModal({ show, onHide, onSave, initial, error }) {
  const { t } = useLanguage();
  const [kunden, setKunden] = useState([]);
  const [form, setForm] = useState({
    name: '', adresse: '', telefon: '', kundeId: '',
  });

  useEffect(() => {
    if (show) {
      kundeApi.getAll(1, 200)
        .then((res) => setKunden(res.data?.items || res.data || []))
        .catch(() => {});
    }
  }, [show]);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        adresse: initial.adresse || '',
        telefon: initial.telefon || '',
        kundeId: initial.kundeId || '',
      });
    } else {
      setForm({ name: '', adresse: '', telefon: '', kundeId: '' });
    }
  }, [initial, show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    Object.entries(form).forEach(([key, value]) => {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });
    payload.kundeId = payload.kundeId || null;
    onSave(payload);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? 'Filiale bearbeiten' : 'Neue Filiale'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            <div className="col-12">
              <Form.Label>Name *</Form.Label>
              <Form.Control required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>Adresse</Form.Label>
              <Form.Control value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Telefon</Form.Label>
              <Form.Control value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Kunde</Form.Label>
              <Form.Select value={form.kundeId}
                onChange={(e) => setForm({ ...form, kundeId: e.target.value })}>
                <option value="">Kein Kunde</option>
                {kunden.map((k) => (
                  <option key={k.id} value={k.id}>{k.unternehmen}</option>
                ))}
              </Form.Select>
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
