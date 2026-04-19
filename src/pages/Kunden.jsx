import { useEffect, useState, useCallback } from 'react';
import { Container, Button, Modal, Form, Alert } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { kundeApi } from '../api/kundeApi';

export default function Kunden() {
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
      setError(err.response?.data?.message || 'Fehler beim Speichern.');
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
    { key: 'unternehmen', label: 'Unternehmen' },
    { key: 'vorname', label: 'Vorname' },
    { key: 'nachname', label: 'Nachname' },
    { key: 'email', label: 'E-Mail' },
    { key: 'telefonMobil', label: 'Telefon' },
    {
      key: 'actions',
      label: 'Aktionen',
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
        <h2>Kunden</h2>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1" /> Neuer Kunde
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Kunden werden geladen..." />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          totalCount={total}
          page={page}
          size={size}
          onPageChange={setPage}
          onSearch={setSearch}
          searchPlaceholder="Kunde suchen..."
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
        title="Kunde loeschen"
        message="Dieser Datensatz wird dauerhaft entfernt. Fortfahren?"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}

function KundeModal({ show, onHide, onSave, initial, error }) {
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
          <Modal.Title>{initial ? 'Kunde bearbeiten' : 'Neuer Kunde'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label>Unternehmen *</Form.Label>
              <Form.Control required value={form.unternehmen}
                onChange={(e) => setForm({ ...form, unternehmen: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>E-Mail *</Form.Label>
              <Form.Control type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Vorname</Form.Label>
              <Form.Control value={form.vorname}
                onChange={(e) => setForm({ ...form, vorname: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Nachname</Form.Label>
              <Form.Control value={form.nachname}
                onChange={(e) => setForm({ ...form, nachname: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Telefon (Mobil)</Form.Label>
              <Form.Control value={form.telefonMobil}
                onChange={(e) => setForm({ ...form, telefonMobil: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Telefon (Haus)</Form.Label>
              <Form.Control value={form.telefonHaus}
                onChange={(e) => setForm({ ...form, telefonHaus: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>Adresse</Form.Label>
              <Form.Control value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Website</Form.Label>
              <Form.Control value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label>Hinweise</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.hinweise}
                onChange={(e) => setForm({ ...form, hinweise: e.target.value })} />
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
