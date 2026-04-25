// ============================================================================
// === IMPORTS ===
// ============================================================================
import { useEffect, useState, useCallback, useRef } from 'react';
import { Container, Button, Modal, Form, Alert, ListGroup, Spinner } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { kundeApi } from '../api/kundeApi';
import { ansprechpartnerApi } from '../api/ansprechpartnerApi';
import { useLanguage } from '../hooks/useLanguage';
import { ApiError } from '../api/errorHandler';
import { usePermission } from '../hooks/usePermission';

// ============================================================================
// === CONSTANTS & HELPERS ===
// ============================================================================
const STORAGE_URL = 'http://localhost:8080';
const imageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${STORAGE_URL}${path}`;
};

// ============================================================================
// === MAIN COMPONENT: KUNDEN ===
// ============================================================================
export default function Kunden() {
  const { t } = useLanguage();
  const { canEdit, canDelete, canCreate } = usePermission(); // NurLesen için butonlar gizlenir

  // ---------- STATE MANAGEMENT ----------
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');
  const [ansprechpartnerKunde, setAnsprechpartnerKunde] = useState(null);
  const size = 20;

  // ---------- EFFECTS & CALLBACKS ----------
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await kundeApi.getAll(page, size, search);
      setData(res.data.items || res.data);
      setTotal(res.data.totalCount || 0);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage(t));
      } else {
        setError(t('kunden.loadError'));
      }
    }
    setLoading(false);
  }, [page, search, t]);

  useEffect(() => { load(); }, [load]);

  // ---------- HANDLERS: SAVE, DELETE ----------
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
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage(t));
      } else {
        setError(t('kunden.saveError'));
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await kundeApi.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage(t));
      } else {
        setError(t('kunden.deleteError'));
      }
    }
  };

  // ---------- TABLE COLUMNS DEFINITION ----------
  const columns = [
    {
      key: 'logo',
      label: 'Logo',
      render: (row) => row.logo ? (
        <img
          src={imageUrl(row.logo)}
          alt="Logo"
          style={{ maxHeight: 36, maxWidth: 72, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }}
        />
      ) : (
        <span className="bi bi-building text-secondary fs-5" />
      ),
    },
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
          {/* Ansprechpartner Button */}
          <Button size="sm" variant="outline-info" className="me-1 rounded-2"
            title="Ansprechpartner"
            onClick={() => setAnsprechpartnerKunde(row)}>
            <i className="bi bi-person-lines-fill" />
          </Button>
          {/* Edit Button — NurLesen göremez */}
          {canEdit && <Button size="sm" variant="outline-primary" className="me-1 rounded-2"
            onClick={() => { setEditItem(row); setShowModal(true); }}>
            <i className="bi bi-pencil" />
          </Button>}
          {/* Delete Button — NurLesen göremez */}
          {canDelete && <Button size="sm" variant="outline-danger" className="rounded-2" onClick={() => setDeleteId(row.id)}>
            <i className="bi bi-trash" />
          </Button>}
        </>
      ),
    },
  ];

  // ---------- RENDER ----------
  return (
    <Container fluid className="py-4">
      {/* Header: Title + New Button */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{t('kunden.title')}</h2>
        {/* Yeni Müşteri — NurLesen göremez */}
        {canCreate && <Button className="rounded-2" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1" /> {t('kunden.new')}
        </Button>}
      </div>

      {/* Error Alert */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* === TABLE === */}
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

      {/* === MODALS === */}
      <KundeModal
        show={showModal}
        onHide={() => { setShowModal(false); setEditItem(null); setError(''); }}
        onSave={handleSave}
        onRefresh={load}
        initial={editItem}
        error={error}
      />

      {/* === DELETE CONFIRMATION === */}
      <ConfirmDialog
        show={!!deleteId}
        title={t('kunden.deleteTitle')}
        message={t('kunden.deleteMessage')}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />

      {/* === ANSPRECHPARTNER MODAL === */}
      {ansprechpartnerKunde && (
        <AnsprechpartnerModal
          kunde={ansprechpartnerKunde}
          onHide={() => setAnsprechpartnerKunde(null)}
        />
      )}
    </Container>
  );
}

// ============================================================================
// === MODAL: KUNDE EDIT/NEW ===
// ============================================================================
function KundeModal({ show, onHide, onSave, onRefresh, initial, error }) {
  const { t } = useLanguage();

  // ---------- STATE MANAGEMENT ----------
  const [form, setForm] = useState({
    unternehmen: '', vorname: '', nachname: '', email: '',
    telefonMobil: '', telefonHaus: '', adresse: '', website: '', logo: '', hinweise: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileInputRef = useRef(null);

  // ---------- EFFECTS ----------
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
        logo: initial.logo || '',
        hinweise: initial.hinweise || '',
      });
    } else {
      setForm({
        unternehmen: '', vorname: '', nachname: '', email: '',
        telefonMobil: '', telefonHaus: '', adresse: '', website: '', logo: '', hinweise: ''
      });
    }
    setFieldErrors({});
    setLogoFile(null);
    setLogoError('');
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [initial, show]);

  // ---------- HANDLERS: LOGO UPLOAD ----------
  const handleLogoFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setLogoError('Sadece PNG, JPEG, JPG formatları desteklenir');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Dosya boyutu 5MB den küçük olmalı');
      return;
    }
    setLogoError('');
    setLogoFile(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !initial?.id) return;
    setLogoUploading(true);
    setLogoError('');
    try {
      const res = await kundeApi.uploadLogo(initial.id, logoFile);
      const newLogo = res.data.logo || res.data.path || res.data.url || '';
      if (newLogo) {
        setForm((f) => ({ ...f, logo: newLogo }));
      }
      if (onRefresh) await onRefresh();
      setLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      if (err instanceof ApiError) {
        setLogoError(err.message);
      } else {
        setLogoError('Logo yüklenirken hata oluştu');
      }
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!initial?.id) return;
    try {
      await kundeApi.deleteLogo(initial.id);
      setForm((f) => ({ ...f, logo: '' }));
      if (onRefresh) await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setLogoError(err.message);
      } else {
        setLogoError('Logo silinirken hata oluştu');
      }
    }
  };

  // ---------- HANDLERS: FORM SUBMIT ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    
    const { logo: _logo, ...rest } = form;
    const payload = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, v === '' ? null : v]),
    );
    
    try {
      await onSave(payload);
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
        }
      }
    }
  };

  // ---------- HELPERS ----------
  const getFieldError = (fieldName) => {
    const error = fieldErrors[fieldName];
    if (!error) return null;
    return Array.isArray(error) ? error[0] : error;
  };

  // ---------- RENDER ----------
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? t('kunden.editTitle') : t('kunden.newTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            {/* === KUNDE FORM === */}

            {/* Unternehmen */}
            <div className="col-md-6">
              <Form.Label>{t('kunden.company')} *</Form.Label>
              <Form.Control 
                required 
                isInvalid={!!fieldErrors.unternehmen}
                value={form.unternehmen}
                onChange={(e) => setForm({ ...form, unternehmen: e.target.value })} 
              />
              {fieldErrors.unternehmen && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('unternehmen')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Email */}
            <div className="col-md-6">
              <Form.Label>{t('auth.email')} *</Form.Label>
              <Form.Control 
                type="email" 
                required 
                isInvalid={!!fieldErrors.email}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
              />
              {fieldErrors.email && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('email')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Vorname */}
            <div className="col-md-6">
              <Form.Label>{t('kunden.firstName')} *</Form.Label>
              <Form.Control 
                required 
                isInvalid={!!fieldErrors.vorname}
                value={form.vorname}
                onChange={(e) => setForm({ ...form, vorname: e.target.value })} 
              />
              {fieldErrors.vorname && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('vorname')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Nachname */}
            <div className="col-md-6">
              <Form.Label>{t('kunden.lastName')} *</Form.Label>
              <Form.Control 
                required 
                isInvalid={!!fieldErrors.nachname}
                value={form.nachname}
                onChange={(e) => setForm({ ...form, nachname: e.target.value })} 
              />
              {fieldErrors.nachname && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('nachname')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Telefon Mobil */}
            <div className="col-md-6">
              <Form.Label>{t('kunden.mobilePhone')}</Form.Label>
              <Form.Control 
                isInvalid={!!fieldErrors.telefonMobil}
                value={form.telefonMobil}
                onChange={(e) => setForm({ ...form, telefonMobil: e.target.value })} 
              />
              {fieldErrors.telefonMobil && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('telefonMobil')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Telefon Haus */}
            <div className="col-md-6">
              <Form.Label>{t('kunden.homePhone')}</Form.Label>
              <Form.Control 
                isInvalid={!!fieldErrors.telefonHaus}
                value={form.telefonHaus}
                onChange={(e) => setForm({ ...form, telefonHaus: e.target.value })} 
              />
              {fieldErrors.telefonHaus && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('telefonHaus')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Adresse */}
            <div className="col-12">
              <Form.Label>{t('kunden.address')}</Form.Label>
              <Form.Control 
                isInvalid={!!fieldErrors.adresse}
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })} 
              />
              {fieldErrors.adresse && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('adresse')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Website */}
            <div className="col-md-6">
              <Form.Label>{t('kunden.website')}</Form.Label>
              <Form.Control 
                isInvalid={!!fieldErrors.website}
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })} 
              />
              {fieldErrors.website && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('website')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* === LOGO === */}
            <div className="col-12">
              <Form.Label>Logo</Form.Label>
              {initial?.id ? (
                <div>
                  {form.logo && (
                    <div className="mb-2 d-flex align-items-center gap-2">
                      <img
                        src={imageUrl(form.logo)}
                        alt="Logo"
                        style={{ maxHeight: 56, maxWidth: 112, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }}
                      />
                      <Button variant="outline-danger" size="sm" className="rounded-2" onClick={handleLogoDelete}>
                        <i className="bi bi-trash" />
                      </Button>
                    </div>
                  )}
                  <div className="d-flex gap-2 align-items-center">
                    <Form.Control
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      ref={fileInputRef}
                      onChange={handleLogoFileSelect}
                    />
                    {logoFile && (
                      <Button variant="outline-primary" size="sm" className="rounded-2" onClick={handleLogoUpload} disabled={logoUploading}>
                        {logoUploading ? <Spinner animation="border" size="sm" /> : 'Yükle'}
                      </Button>
                    )}
                  </div>
                  {logoError && <small className="text-danger d-block mt-1">{logoError}</small>}
                </div>
              ) : (
                <small className="text-muted d-block">Logo, müşteri kaydedildikten sonra yüklenebilir.</small>
              )}
            </div>

            {/* === NOTLAR === */}
            <div className="col-12">
              <Form.Label>{t('kunden.notes')}</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2} 
                isInvalid={!!fieldErrors.hinweise}
                value={form.hinweise}
                onChange={(e) => setForm({ ...form, hinweise: e.target.value })} 
              />
              {fieldErrors.hinweise && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('hinweise')}
                </Form.Control.Feedback>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" className="rounded-2" onClick={onHide} disabled={saving}>{t('common.cancel')}</Button>
          <Button 
            type="submit" 
            variant="primary" 
            className="rounded-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Speichern...
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

// ============================================================================
// === MODAL: ANSPRECHPARTNER ===
// ============================================================================
function AnsprechpartnerModal({ kunde, onHide }) {
  const { t } = useLanguage();

  // ---------- STATE MANAGEMENT ----------
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', telefon: '', email: '', abteilung: '' });
  const [error, setError] = useState('');

  // ---------- EFFECTS & CALLBACKS ----------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ansprechpartnerApi.getByKunde(kunde.id);
      setList(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [kunde.id]);

  useEffect(() => { load(); }, [load]);

  // ---------- HANDLERS ----------
  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', telefon: '', email: '', abteilung: '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      telefon: item.telefon || '',
      email: item.email || '',
      abteilung: item.abteilung || ''
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, kundeId: kunde.id };
      if (editItem) {
        await ansprechpartnerApi.update(editItem.id, payload);
      } else {
        await ansprechpartnerApi.create(payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('common.saveError', 'Fehler beim Speichern'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await ansprechpartnerApi.delete(id);
      load();
    } catch { /* ignore */ }
  };

  // ---------- RENDER ----------
  return (
    <Modal show onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-person-lines-fill me-2" />
          Ansprechpartner — {kunde.unternehmen}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-3"><Spinner size="sm" /></div>
        ) : (
          <>
            {!showForm ? (
              <>
                {/* === ANSPRECHPARTNER LIST === */}
                <div className="d-flex justify-content-end mb-2">
                  <Button size="sm" className="rounded-2" onClick={openNew}>
                    <i className="bi bi-plus-lg me-1" /> Neu
                  </Button>
                </div>
                <ListGroup>
                  {list.length === 0 && (
                    <ListGroup.Item className="text-muted">{t('common.noData')}</ListGroup.Item>
                  )}
                  {list.map((item) => (
                    <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{item.name}</strong>
                        {item.abteilung && <span className="ms-2 text-muted small">{item.abteilung}</span>}
                        <div className="small text-muted">
                          {item.telefon && <span className="me-3"><i className="bi bi-telephone me-1" />{item.telefon}</span>}
                          {item.email && <span><i className="bi bi-envelope me-1" />{item.email}</span>}
                        </div>
                      </div>
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-primary" className="rounded-2" onClick={() => openEdit(item)}>
                          <i className="bi bi-pencil" />
                        </Button>
                        <Button size="sm" variant="outline-danger" className="rounded-2" onClick={() => handleDelete(item.id)}>
                          <i className="bi bi-trash" />
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </>
            ) : (
              <>
                {/* === ANSPRECHPARTNER FORM === */}
                <Form onSubmit={handleSave}>
                  {error && <Alert variant="danger">{error}</Alert>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <Form.Label>Name *</Form.Label>
                      <Form.Control required value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <Form.Label>Abteilung</Form.Label>
                      <Form.Control value={form.abteilung}
                        onChange={(e) => setForm({ ...form, abteilung: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <Form.Label>Telefon</Form.Label>
                      <Form.Control value={form.telefon}
                        onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <Form.Label>E-Mail</Form.Label>
                      <Form.Control type="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <Button type="submit" variant="primary" className="rounded-2">{t('common.save')}</Button>
                    <Button variant="secondary" className="rounded-2" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
                  </div>
                </Form>
              </>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
