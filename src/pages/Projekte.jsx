import { useEffect, useState, useCallback } from 'react';
import { Container, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import { projektApi } from '../api/projektApi';

const statusOptions = ['NichtGestartet', 'InBearbeitung', 'Abgeschlossen', 'Pausiert'];
const prioritaetOptions = ['Niedrig', 'Mittel', 'Hoch', 'Kritisch'];

export default function Projekte() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
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
      setError(err.response?.data?.message || 'Fehler beim Speichern.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Wirklich löschen?')) return;
    try { await projektApi.delete(id); load(); } catch { /* ignore */ }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'prioritaet', label: 'Priorität', render: (r) => <StatusBadge value={r.prioritaet} /> },
    { key: 'abschlussInProzent', label: '%', render: (r) => `${r.abschlussInProzent ?? 0}%` },
    { key: 'startdatum', label: 'Start', render: (r) => r.startdatum?.slice(0, 10) || '—' },
    { key: 'enddatum', label: 'Ende', render: (r) => r.enddatum?.slice(0, 10) || '—' },
    {
      key: 'actions', label: 'Aktionen',
      render: (row) => (
        <>
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
        <h2>Projekte</h2>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>+ Neues Projekt</Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner /></div>
      ) : (
        <DataTable columns={columns} data={data} totalCount={total}
          page={page} size={size} onPageChange={setPage} onSearch={setSearch}
          searchPlaceholder="Projekt suchen..." />
      )}

      <ProjektModal show={showModal}
        onHide={() => { setShowModal(false); setEditItem(null); setError(''); }}
        onSave={handleSave} initial={editItem} error={error} />
    </Container>
  );
}

function ProjektModal({ show, onHide, onSave, initial, error }) {
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
          <Modal.Title>{initial ? 'Projekt bearbeiten' : 'Neues Projekt'}</Modal.Title>
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
              <Form.Label>Beschreibung</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.beschreibung}
                onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>Priorität</Form.Label>
              <Form.Select value={form.prioritaet}
                onChange={(e) => setForm({ ...form, prioritaet: e.target.value })}>
                {prioritaetOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>Startdatum</Form.Label>
              <Form.Control type="date" value={form.startdatum}
                onChange={(e) => setForm({ ...form, startdatum: e.target.value })} />
            </div>
            <div className="col-md-4">
              <Form.Label>Enddatum</Form.Label>
              <Form.Control type="date" value={form.enddatum}
                onChange={(e) => setForm({ ...form, enddatum: e.target.value })} />
            </div>
            <div className="col-md-4">
              <Form.Label>Abschluss %</Form.Label>
              <Form.Control type="number" min={0} max={100} value={form.abschlussInProzent}
                onChange={(e) => setForm({ ...form, abschlussInProzent: +e.target.value })} />
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
