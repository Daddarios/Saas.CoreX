import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Container, Form, Modal, Badge } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { zahlungApi } from '../api/zahlungApi';
import { useLanguage } from '../hooks/useLanguage';
import { ApiError } from '../api/errorHandler';
import { usePermission } from '../hooks/usePermission';

const statusColors = {
  Ausstehend: 'warning',
  Bezahlt: 'success',
  Fehlgeschlagen: 'danger',
  Erstattet: 'info',
  Storniert: 'secondary',
};

const statusOptions = ['Ausstehend', 'Bezahlt', 'Fehlgeschlagen', 'Erstattet', 'Storniert'];

export default function Zahlung() {
  const { t } = useLanguage();
  const { canEdit, canCreate } = usePermission();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const size = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await zahlungApi.getAll(page, size);
      setData(res.data?.items || res.data || []);
      setTotal(res.data?.totalCount || 0);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Zahlungen konnten nicht geladen werden.');
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData) => {
    setError('');
    try {
      await zahlungApi.create(formData);
      setShowModal(false);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Speichern fehlgeschlagen.');
      }
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await zahlungApi.updateStatus(id, status);
      load();
    } catch { /* ignore */ }
  };

  const columns = [
    { key: 'rechnungsnummer', label: 'Rechnungs-Nr.' },
    { key: 'betrag', label: 'Betrag', render: (r) => r.betrag != null ? `€${r.betrag.toFixed(2)}` : '—' },
    {
      key: 'status', label: 'Status',
      render: (r) => (
        <Badge bg={statusColors[r.status] || 'secondary'}>{r.status}</Badge>
      ),
    },
    { key: 'zahlungsdatum', label: 'Datum', render: (r) => r.zahlungsdatum?.slice(0, 10) || '—' },
    { key: 'zahlungsmethode', label: 'Methode' },
    {
      key: 'actions', label: t('common.actions'),
      render: (row) => (
        <div className="d-flex gap-1 align-items-center">
          {canEdit && (
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={row.status}
              onChange={(e) => changeStatus(row.id, e.target.value)}
            >
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2><i className="bi bi-wallet2 me-2" />Zahlungen</h2>
        {canCreate && (
          <Button className="rounded-3" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-lg me-1" /> Neue Zahlung
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <LoadingSpinner text="Zahlungen werden geladen..." />
      ) : (
        <DataTable columns={columns} data={data} totalCount={total}
          page={page} size={size} onPageChange={setPage} />
      )}

      <ZahlungModal
        show={showModal}
        onHide={() => { setShowModal(false); setError(''); }}
        onSave={handleSave}
        error={error}
      />
    </Container>
  );
}

function ZahlungModal({ show, onHide, onSave, error }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    rechnungsnummer: '', betrag: '', zahlungsdatum: '',
    zahlungsmethode: '', status: 'Ausstehend',
  });

  useEffect(() => {
    if (show) {
      setForm({ rechnungsnummer: '', betrag: '', zahlungsdatum: '',
        zahlungsmethode: '', status: 'Ausstehend' });
    }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      betrag: form.betrag !== '' ? parseFloat(form.betrag) : null,
      zahlungsdatum: form.zahlungsdatum || null,
    };
    onSave(payload);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Neue Zahlung</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label>Rechnungs-Nr. *</Form.Label>
              <Form.Control required value={form.rechnungsnummer}
                onChange={(e) => setForm({ ...form, rechnungsnummer: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Betrag (€) *</Form.Label>
              <Form.Control type="number" step="0.01" min="0" required value={form.betrag}
                onChange={(e) => setForm({ ...form, betrag: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Datum</Form.Label>
              <Form.Control type="date" value={form.zahlungsdatum}
                onChange={(e) => setForm({ ...form, zahlungsdatum: e.target.value })} />
            </div>
            <div className="col-md-6">
              <Form.Label>Methode</Form.Label>
              <Form.Select value={form.zahlungsmethode}
                onChange={(e) => setForm({ ...form, zahlungsmethode: e.target.value })}>
                <option value="">Bitte auswählen...</option>
                <option value="Überweisung">Überweisung</option>
                <option value="Kreditkarte">Kreditkarte</option>
                <option value="SEPA">SEPA</option>
                <option value="PayPal">PayPal</option>
                <option value="Bar">Bar</option>
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
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
