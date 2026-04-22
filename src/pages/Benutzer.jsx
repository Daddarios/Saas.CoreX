import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Container, Form, Modal } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { benutzerApi } from '../api/benutzerApi';
import { useLanguage } from '../hooks/useLanguage';

const rollen = ['SuperAdmin', 'Admin', 'Manager', 'Standard', 'NurLesen'];

export default function Benutzer() {
  const { t } = useLanguage();
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
      setError(err.response?.data?.message || t('benutzer.loadError'));
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
      setError(err.response?.data?.message || t('benutzer.saveError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await benutzerApi.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('benutzer.deleteError'));
    }
  };

  const columns = [
    { key: 'vorname', label: t('kunden.firstName') },
    { key: 'nachname', label: t('kunden.lastName') },
    { key: 'email', label: t('auth.email') },
    { key: 'rolle', label: t('benutzer.role') },
    {
      key: 'actions',
      label: t('common.actions'),
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
        <h2 className="mb-0">{t('benutzer.title')}</h2>
        <Button
          onClick={() => {
            setEditItem(null);
            setShowModal(true);
          }}
        >
          <i className="bi bi-plus-lg me-1" /> {t('benutzer.new')}
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <LoadingSpinner text={t('benutzer.loading')} />
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
        title={t('benutzer.deleteTitle')}
        message={t('benutzer.deleteMessage')}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}

function BenutzerModal({ show, initial, onHide, onSave }) {
  const { t } = useLanguage();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    vorname: '', nachname: '', email: '', rolle: 'Standard',
    passwort: '', rufNummer: '', abteilung: '', hinweise: '',
  });

  useEffect(() => {
    if (initial) {
      setForm({
        vorname: initial.vorname || '',
        nachname: initial.nachname || '',
        email: initial.email || '',
        rolle: initial.rolle || 'Standard',
        passwort: '',
        rufNummer: initial.rufNummer || '',
        abteilung: initial.abteilung || '',
        hinweise: initial.hinweise || '',
      });
    } else {
      setForm({
        vorname: '', nachname: '', email: '', rolle: 'Standard',
        passwort: '', rufNummer: '', abteilung: '', hinweise: '',
      });
    }
  }, [initial, show]);

  const submit = (e) => {
    e.preventDefault();
    // Edit modunda passwort gönderme (PUT endpoint'inde yok)
    const payload = { ...form };
    if (isEdit) {
      delete payload.passwort;
      delete payload.email;
    }
    // Boş string'leri null'a çevir
    const cleaned = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v]),
    );
    onSave(cleaned);
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? t('benutzer.editTitle') : t('benutzer.newTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-6">
              <Form.Label>{t('kunden.firstName')} *</Form.Label>
              <Form.Control
                required
                value={form.vorname}
                onChange={(e) => setForm({ ...form, vorname: e.target.value })}
              />
            </div>
            <div className="col-6">
              <Form.Label>{t('kunden.lastName')} *</Form.Label>
              <Form.Control
                required
                value={form.nachname}
                onChange={(e) => setForm({ ...form, nachname: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <Form.Label>{t('auth.email')} *</Form.Label>
              <Form.Control
                required
                type="email"
                value={form.email}
                disabled={isEdit}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            {!isEdit && (
              <div className="col-md-6">
                <Form.Label>Passwort *</Form.Label>
                <Form.Control
                  required
                  type="password"
                  value={form.passwort}
                  onChange={(e) => setForm({ ...form, passwort: e.target.value })}
                  placeholder="min 8, A-z, 0-9, Sonderzeichen"
                />
              </div>
            )}
            <div className="col-md-4">
              <Form.Label>{t('benutzer.role')}</Form.Label>
              <Form.Select
                value={form.rolle}
                onChange={(e) => setForm({ ...form, rolle: e.target.value })}
              >
                {rollen.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>Rufnummer</Form.Label>
              <Form.Control
                value={form.rufNummer}
                onChange={(e) => setForm({ ...form, rufNummer: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <Form.Label>Abteilung</Form.Label>
              <Form.Control
                value={form.abteilung}
                onChange={(e) => setForm({ ...form, abteilung: e.target.value })}
              />
            </div>
            <div className="col-12">
              <Form.Label>Hinweise</Form.Label>
              <Form.Control as="textarea" rows={2}
                value={form.hinweise}
                onChange={(e) => setForm({ ...form, hinweise: e.target.value })}
              />
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