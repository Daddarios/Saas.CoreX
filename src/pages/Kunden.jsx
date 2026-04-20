import { useEffect, useState, useCallback } from 'react';
import { Container, Button, Modal, Form, Alert } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { kundeApi } from '../api/kundeApi';
import { useLanguage } from '../hooks/useLanguage';

export default function Kunden() {
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
      const res = await kundeApi.getAll(page, size, search);
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
        await kundeApi.update(editItem.id, formData);
      } else {
        await kundeApi.create(formData);
      }
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('kunden.saveError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await kundeApi.delete(deleteId);
      setDeleteId(null);
      load();
    } catch { /* ignore */ }
  };

  const columns = [
    { key: 'unternehmen', label: t('kunden.company') },
    { key: 'vorname', label: t('kunden.firstName') },
    { key: 'nachname', label: t('kunden.lastName') },
    { key: 'email', label: t('auth.email') },
    { key: 'telefonMobil', label: t('kunden.phone') },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (row) => (
        <>
          <Button size="sm" variant="outline-primary" className="me-1"
            onClick={() => { setEditItem(row); setShowModal(true); }}>
            <i className="bi bi-pencil" />
          </Button>
          <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(row.id)}>
            <i className="bi bi-trash" />
          </Button>
        </>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{t('kunden.title')}</h2>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1" /> {t('kunden.new')}
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text={t('kunden.loading')} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          totalCount={total}
          page={page}
          size={size}
          onPageChange={setPage}
          onSearch={setSearch}
          searchPlaceholder={t('kunden.search')}
        />
      )}

      <KundeModal
        show={showModal}
        onHide={() => { setShowModal(false); setEditItem(null); setError(''); }}
        onSave={handleSave}
        initial={editItem}
        error={error}
      />

      <ConfirmDialog
        show={!!deleteId}
        title={t('kunden.deleteTitle')}
        message={t('kunden.deleteMessage')}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}

function KundeModal({ show, onHide, onSave, initial, error }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    unternehmen: '', vorname: '', nachname: '', email: '',
    telefonMobil: '', telefonHaus: '', adresse: '', website: '', hinweise: '',
  });

  useEffect(() => {
    if (initial) {
      setForm({
        unternehmen: initial.unternehmen || '',
        vorname: initial.vorname || '',
        nachname: initial.nachname || '',
        email: initial.email || '',
        telefonMobil: initial.telefonMobil || '',
        telefonHaus: initial.telefonHaus || '',
        adresse: initial.adresse || '',
        website: initial.website || '',
        hinweise: initial.hinweise || '',
      });
    } else {
      setForm({ unternehmen: '', vorname: '', nachname: '', email: '',
        telefonMobil: '', telefonHaus: '', adresse: '', website: '', hinweise: '' });
    }
  }, [initial, show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? t('kunden.editTitle') : t('kunden.newTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label>{t('kunden.company')} *</Form.Label>
              <Form.Control required value={form.unternehmen}
                onChange={(e) => setForm({ ...form, unternehmen: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('auth.email')} *</Form.Label>
              <Form.Control type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('kunden.firstName')}</Form.Label>
              <Form.Control value={form.vorname}
                onChange={(e) => setForm({ ...form, vorname: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('kunden.lastName')}</Form.Label>
              <Form.Control value={form.nachname}
                onChange={(e) => setForm({ ...form, nachname: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('kunden.mobilePhone')}</Form.Label>
              <Form.Control value={form.telefonMobil}
                onChange={(e) => setForm({ ...form, telefonMobil: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('kunden.homePhone')}</Form.Label>
              <Form.Control value={form.telefonHaus}
                onChange={(e) => setForm({ ...form, telefonHaus: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>{t('kunden.address')}</Form.Label>
              <Form.Control value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('kunden.website')}</Form.Label>
              <Form.Control value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>{t('kunden.notes')}</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.hinweise}
                onChange={(e) => setForm({ ...form, hinweise: e.target.value })} />
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
