import { useEffect, useState, useCallback } from 'react';
import { Container, Button, Modal, Form, Alert } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { projektApi } from '../api/projektApi';
import { useLanguage } from '../hooks/useLanguage';

const statusOptions = ['NichtGestartet', 'InBearbeitung', 'Abgeschlossen', 'Pausiert'];
const prioritaetOptions = ['Niedrig', 'Mittel', 'Hoch', 'Kritisch'];

export default function Projekte() {
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');
  const size = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projektApi.getAll(page, size, search);
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
        await projektApi.update(editItem.id, formData);
      } else {
        await projektApi.create(formData);
      }
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('projekte.saveError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await projektApi.delete(deleteId);
      setDeleteId(null);
      load();
    } catch { /* ignore */ }
  };

  const columns = [
    { key: 'name', label: t('projekte.name') },
    { key: 'status', label: t('common.status'), render: (r) => <StatusBadge value={r.status} /> },
    { key: 'prioritaet', label: t('common.priority'), render: (r) => <StatusBadge value={r.prioritaet} /> },
    { key: 'abschlussInProzent', label: '%', render: (r) => `${r.abschlussInProzent ?? 0}%` },
    { key: 'startdatum', label: t('projekte.start'), render: (r) => r.startdatum?.slice(0, 10) || '—' },
    { key: 'enddatum', label: t('projekte.end'), render: (r) => r.enddatum?.slice(0, 10) || '—' },
    {
      key: 'actions', label: t('common.actions'),
      render: (row) => (
        <>
          <Button size="sm" variant="outline-primary" className="me-1"
            onClick={() => { setEditItem(row); setShowModal(true); }}><i className="bi bi-pencil" /></Button>
          <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(row.id)}><i className="bi bi-trash" /></Button>
        </>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{t('projekte.title')}</h2>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1" /> {t('projekte.new')}
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text={t('projekte.loading')} />
      ) : (
        <DataTable columns={columns} data={data} totalCount={total}
          page={page} size={size} onPageChange={setPage} onSearch={setSearch}
          searchPlaceholder={t('projekte.search')} />
      )}

      <ProjektModal show={showModal}
        onHide={() => { setShowModal(false); setEditItem(null); setError(''); }}
        onSave={handleSave} initial={editItem} error={error} />

      <ConfirmDialog
        show={!!deleteId}
        title={t('projekte.deleteTitle')}
        message={t('projekte.deleteMessage')}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}

function ProjektModal({ show, onHide, onSave, initial, error }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: '', beschreibung: '', startdatum: '', enddatum: '',
    status: 'NichtGestartet', prioritaet: 'Mittel', abschlussInProzent: 0,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        beschreibung: initial.beschreibung || '',
        startdatum: initial.startdatum?.slice(0, 10) || '',
        enddatum: initial.enddatum?.slice(0, 10) || '',
        status: initial.status || 'NichtGestartet',
        prioritaet: initial.prioritaet || 'Mittel',
        abschlussInProzent: initial.abschlussInProzent ?? 0,
      });
    } else {
      setForm({ name: '', beschreibung: '', startdatum: '', enddatum: '',
        status: 'NichtGestartet', prioritaet: 'Mittel', abschlussInProzent: 0 });
    }
  }, [initial, show]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? t('projekte.editTitle') : t('projekte.newTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            <div className="col-12">
              <Form.Label>{t('projekte.name')} *</Form.Label>
              <Form.Control required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>{t('projekte.description')}</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.beschreibung}
                onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('common.status')}</Form.Label>
              <Form.Select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s} value={s}>{t(`status.${s}`, s)}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>{t('common.priority')}</Form.Label>
              <Form.Select value={form.prioritaet}
                onChange={(e) => setForm({ ...form, prioritaet: e.target.value })}>
                {prioritaetOptions.map((p) => <option key={p} value={p}>{t(`status.${p}`, p)}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>{t('projekte.start')}</Form.Label>
              <Form.Control type="date" value={form.startdatum}
                onChange={(e) => setForm({ ...form, startdatum: e.target.value })} />
            </div>
            <div className="col-md-4">
              <Form.Label>{t('projekte.end')}</Form.Label>
              <Form.Control type="date" value={form.enddatum}
                onChange={(e) => setForm({ ...form, enddatum: e.target.value })} />
            </div>
            <div className="col-md-4">
              <Form.Label>{t('projekte.completion')}</Form.Label>
              <Form.Control type="number" min={0} max={100} value={form.abschlussInProzent}
                onChange={(e) => setForm({ ...form, abschlussInProzent: +e.target.value })} />
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
