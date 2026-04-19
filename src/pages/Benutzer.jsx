import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Container, Form, Modal } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { benutzerApi } from '../api/benutzerApi';

const rollen = ['Admin', 'Manager', 'Mitarbeiter'];

export default function Benutzer() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await benutzerApi.getAll();
      setUsers(res.data.items || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Benutzer konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (payload) => {
    setError('');
    try {
      if (editItem) {
        await benutzerApi.update(editItem.id, payload);
      } else {
        await benutzerApi.create(payload);
      }
      setShowModal(false);
      setEditItem(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Benutzer konnte nicht gespeichert werden.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await benutzerApi.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Benutzer konnte nicht geloescht werden.');
    }
  };

  const columns = [
    { key: 'vorname', label: 'Vorname' },
    { key: 'nachname', label: 'Nachname' },
    { key: 'email', label: 'E-Mail' },
    { key: 'rolle', label: 'Rolle' },
    {
      key: 'actions',
      label: 'Aktionen',
      render: (row) => (
        <div className="d-flex gap-1">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => {
              setEditItem(row);
              setShowModal(true);
            }}
          >
            <i className="bi bi-pencil" />
          </Button>
          <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(row.id)}>
            <i className="bi bi-trash" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Benutzer</h2>
        <Button
          onClick={() => {
            setEditItem(null);
            setShowModal(true);
          }}
        >
          <i className="bi bi-plus-lg me-1" /> Neu
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <LoadingSpinner text="Benutzer werden geladen..." />
      ) : (
        <DataTable columns={columns} data={users} totalCount={users.length} size={20} page={1} />
      )}

      <BenutzerModal
        show={showModal}
        initial={editItem}
        onHide={() => {
          setShowModal(false);
          setEditItem(null);
        }}
        onSave={handleSave}
      />

      <ConfirmDialog
        show={!!deleteId}
        title="Benutzer loeschen"
        message="Dieser Benutzer wird dauerhaft entfernt. Fortfahren?"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}

function BenutzerModal({ show, initial, onHide, onSave }) {
  const [form, setForm] = useState({ vorname: '', nachname: '', email: '', rolle: 'Mitarbeiter' });

  useEffect(() => {
    if (initial) {
      setForm({
        vorname: initial.vorname || '',
        nachname: initial.nachname || '',
        email: initial.email || '',
        rolle: initial.rolle || 'Mitarbeiter',
      });
    } else {
      setForm({ vorname: '', nachname: '', email: '', rolle: 'Mitarbeiter' });
    }
  }, [initial, show]);

  const submit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-6">
              <Form.Label>Vorname *</Form.Label>
              <Form.Control
                required
                value={form.vorname}
                onChange={(e) => setForm({ ...form, vorname: e.target.value })}
              />
            </div>
            <div className="col-6">
              <Form.Label>Nachname *</Form.Label>
              <Form.Control
                required
                value={form.nachname}
                onChange={(e) => setForm({ ...form, nachname: e.target.value })}
              />
            </div>
            <div className="col-12">
              <Form.Label>E-Mail *</Form.Label>
              <Form.Control
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="col-12">
              <Form.Label>Rolle</Form.Label>
              <Form.Select
                value={form.rolle}
                onChange={(e) => setForm({ ...form, rolle: e.target.value })}
              >
                {rollen.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Form.Select>
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