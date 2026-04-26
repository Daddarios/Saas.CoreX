// ============================================================================
// === IMPORTS ===
// ============================================================================
import { useCallback, useEffect, useState, useRef } from 'react';
import { Alert, Button, Container, Form, Modal, Spinner } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { benutzerApi } from '../api/benutzerApi';
import { useLanguage } from '../hooks/useLanguage';
import { ApiError, parseApiError } from '../api/errorHandler';
import { usePermission } from '../hooks/usePermission';

// ============================================================================
// === CONSTANTS & HELPERS ===
// ============================================================================
const rollen = ['SuperAdmin', 'Admin', 'Manager', 'Standard', 'NurLesen'];
const STORAGE_URL = 'http://localhost:8080';
const imageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${STORAGE_URL}${path}`;
};

// ============================================================================
// === MAIN COMPONENT: BENUTZER ===
// ============================================================================
export default function Benutzer() {
  const { t } = useLanguage();
  const { canManageUsers } = usePermission(); // Admin, SuperAdmin & Manager butonları görür

  // ---------- STATE MANAGEMENT ----------
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const size = 20;

  // ---------- EFFECTS & CALLBACKS ----------
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await benutzerApi.getAll(page, size, search);
      setUsers(res.data.items || res.data || []);
      setTotal(res.data.totalCount || 0);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage(t));
      } else {
        setError(t('benutzer.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, t]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- HANDLERS: SAVE, DELETE ----------
  const handleSave = async (payload) => {
    setError('');
    try {
      let response;
      if (editItem) {
        response = await benutzerApi.update(editItem.id, payload);
      } else {
        response = await benutzerApi.create(payload);
      }
      // Response'u return et ki modal içinde kullanabilelim
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage(t));
      } else {
        setError(t('benutzer.saveError'));
      }
      throw err; // Hatayı yukarı fırlat ki modal handle edebilsin
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await benutzerApi.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage(t));
      } else {
        setError(t('benutzer.deleteError'));
      }
    }
  };

  // ---------- TABLE COLUMNS DEFINITION ----------
  const columns = [
    {
      key: 'bild',
      label: 'Bild',
      render: (row) => row.bild ? (
        <img
          src={imageUrl(row.bild)}
          alt=""
          style={{ width: 46, height: 46, borderRadius: '30%', objectFit: 'cover', border: '1px solid #ddd' }}
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
        />
      ) : (
        <span className="bi bi-person-circle fs-4 text-secondary" />
      ),
    },
    { key: 'vorname', label: t('kunden.firstName') },
    { key: 'nachname', label: t('kunden.lastName') },
    { key: 'email', label: t('auth.email') },
    { key: 'rolle', label: t('benutzer.role') },
    { key: 'abteilung', label: t('benutzer.abteilung') },
    { key: 'rufNummer', label: t('benutzer.rufNummer') },
    
    
    {
      key: 'actions',
      label: t('common.actions'),
      render: (row) => (
        <div className="d-flex gap-1 justify-content-center align-items-center">
          {/* Eye Button: Her zaman görünür */}
          <Button
            className='border-0 bg-transparent'
            size="xl"
            variant="outline-info"
            onClick={() => {
              setViewItem(row);
              setShowViewModal(true);
            }}
          >
            <i className="bi bi-eye" />
          </Button>
          {/* Edit & Delete: Sadece Admin ve SuperAdmin görür */}
          {canManageUsers && (
            <>
              <Button
                className='border-0 bg-transparent'
                size="xl"
                variant="outline-primary"
                onClick={() => {
                  setEditItem(row);
                  setShowModal(true);
                }}
              >
                <i className="bi bi-pencil-square" />
              </Button>
              <Button className='border-0 bg-transparent' size="xl" variant="outline-danger" onClick={() => setDeleteId(row.id)}>
                <i className="bi bi-trash" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];


  // ---------- RENDER ----------
  return (
    
    <Container fluid className="py-4">
      {/* Header: Title + New Button */}
      <div className="d-flex justify-content-between align-items-center ">
        <h2 className="mb-5">Personal</h2>
        <Button className="rounded-3 bg-outline-primary"
          onClick={() => {
            setEditItem(null);
            setShowModal(true);
          }}
          style={{ display: canManageUsers ? 'inline-flex' : 'none' }} // Admin, SuperAdmin & Manager görür
        >
          <i className="bi bi-plus-lg me-1" /> {t('benutzer.new')}
        </Button>
      </div>

      {/* Error Alert */}
      {error && <Alert  className=" w-25 text-center justify-content-center mx-auto" variant="danger"><i className="bi bi-exclamation-triangle-fill me-2"></i> {error}</Alert>}

      {/* === TABLO === */}
      {loading ? (
        <LoadingSpinner text={t('benutzer.loading')} />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          totalCount={total}
          size={size}
          page={page}
          onPageChange={setPage}
          onSearch={setSearch}
          searchPlaceholder={t('benutzer.search')}
        />
      )}

      {/* === MODALS === */}
      <BenutzerModal
        show={showModal}
        initial={editItem}
        onHide={() => {
          setShowModal(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        onRefresh={load}
      />

      <BenutzerViewModal
        show={showViewModal}
        item={viewItem}
        onHide={() => {
          setShowViewModal(false);
          setViewItem(null);
        }}
      />

      {/* === DELETE CONFIRMATION === */}
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

// ============================================================================
// === MODAL: BENUTZER VIEW (READ-ONLY) ===
// ============================================================================
function BenutzerViewModal({ show, item, onHide }) {
  const { t } = useLanguage();
  
  if (!item) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{t('benutzer.viewTitle') || 'Benutzer Details'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row g-2">
          {/* Avatar Display */}
          <div className="col-12 text-start mb-2">
            {item.bild ? (
              <img
                src={imageUrl(item.bild)}
                alt={item.vorname}
                style={{ width: 60, height: 60, borderRadius: '10%', objectFit: 'cover', border: '2px solid #ddd',boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
              />
            ) : (
              <span className="bi bi-person-circle" style={{ fontSize: 60 }} />
            )}
          </div>

          {/* Vorname & Nachname */}
          <div className="col-6">
            <label className="fw-bold text-muted small">{t('kunden.firstName')}</label>
            <p className="mb-3">{item.vorname || '—'}</p>
          </div>
          <div className="col-6">
            <label className="fw-bold text-muted small">{t('kunden.lastName')}</label>
            <p className="mb-3">{item.nachname || '—'}</p>
          </div>

          {/* Email & Rolle */}
          <div className="col-md-6">
            <label className="fw-bold text-muted small">{t('auth.email')}</label>
            <p className="mb-3">{item.email || '—'}</p>
          </div>
          <div className="col-md-6">
            <label className="fw-bold text-muted small">{t('benutzer.role')}</label>
            <p className="mb-3">{item.rolle || '—'}</p>
          </div>

          {/* Abteilung & RufNummer */}
          <div className="col-md-6">
            <label className="fw-bold text-muted small">{t('benutzer.abteilung')}</label>
            <p className="mb-3">{item.abteilung || '—'}</p>
          </div>
          <div className="col-md-6">
            <label className="fw-bold text-muted small">{t('benutzer.rufNummer')}</label>
            <p className="mb-3">{item.rufNummer || '—'}</p>
          </div>

          {/* Hinweise */}
          <div className="col-12">
            <label className="fw-bold text-muted small">Hinweise</label>
            <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{item.hinweise || '—'}</p>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" className="rounded-2" onClick={onHide}>Schließen</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ============================================================================
// === MODAL: BENUTZER EDIT/NEW ===
// ============================================================================
function BenutzerModal({ show, initial, onHide, onSave, onRefresh }) {
  const { t } = useLanguage();
  const isEdit = !!initial;

  // ---------- STATE MANAGEMENT ----------
  const [form, setForm] = useState({
    vorname: '', nachname: '', email: '', rolle: 'Standard',
    passwort: '', rufNummer: '', abteilung: '', bild: '', hinweise: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bildFile, setBildFile] = useState(null);
  const [bildError, setBildError] = useState('');
  const fileInputRef = useRef(null);

  // ---------- EFFECTS ----------
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
        bild: initial.bild || '',
        hinweise: initial.hinweise || '',
      });
    } else {
      setForm({
        vorname: '', nachname: '', email: '', rolle: 'Standard',
        passwort: '', rufNummer: '', abteilung: '', bild: '', hinweise: '',
      });
    }
    setFieldErrors({});
    setBildFile(null);
    setBildError('');
    setSaveError('');
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [initial, show]);

  // ---------- HANDLERS: PROFILE IMAGE ----------
  const handleBildFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setBildError('Sadece PNG, JPEG, JPG formatları desteklenir');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setBildError('Dosya boyutu 5MB den küçük olmalı');
      return;
    }
    setBildError('');
    setBildFile(file);
  };

  const handleBildDelete = async () => {
    if (!initial?.id) return;
    setBildError('');
    try {
      await benutzerApi.deleteAvatar(initial.id);
      setForm((f) => ({ ...f, bild: '' }));
      if (onRefresh) await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setBildError(err.message);
      } else {
        setBildError('Avatar silinirken hata oluştu');
      }
    }
  };

  const handleBildRemoveSelection = () => {
    setBildFile(null);
    setBildError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------- HANDLERS: FORM SUBMIT ----------
  const submit = async (e) => {
    e.preventDefault();
    setSaveError('');
    setFieldErrors({});
    setBildError('');
    setSaving(true);
    
    // Payload hazırla
    const payload = { ...form };
    if (isEdit) {
      delete payload.passwort;
      delete payload.email;
    }
    delete payload.bild;
    
    // Boş string gönder (NULL değil) - backend zorunlu alanlar için
    const cleaned = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === 'string') {
        cleaned[key] = value.trim();
      } else {
        cleaned[key] = value ?? '';
      }
    });
    
    console.log('[Benutzer] Submitting payload:', cleaned);
    
    try {
      // 1. Önce kullanıcı bilgilerini kaydet
      const response = await onSave(cleaned);
      
      // 2. Eğer avatar dosyası seçilmişse, şimdi yükle
      if (bildFile) {
        const userId = initial?.id || response?.data?.id;
        
        if (userId) {
          try {
            await benutzerApi.uploadAvatar(userId, bildFile);
          } catch (avatarErr) {
            if (avatarErr instanceof ApiError) {
              setBildError(`Kullanıcı kaydedildi ancak avatar yüklenemedi: ${avatarErr.message}`);
            } else {
              setBildError('Kullanıcı kaydedildi ancak avatar yüklenemedi');
            }
            setSaving(false);
            if (onRefresh) await onRefresh();
            return;
          }
        }
      }
      
      // Her şey başarılı
      if (onRefresh) await onRefresh();
      onHide();
      setSaving(false);
      
    } catch (err) {
      setSaving(false);
      
      if (err instanceof ApiError) {
        if (err.message) {
          setSaveError(err.message);
        }
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
          console.error('[Benutzer] Field validation errors:', err.fieldErrors);
        }
      } else {
        setSaveError('Speichern fehlgeschlagen');
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
    <Modal show={show} onHide={onHide} centered size="lg">
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? t('benutzer.editTitle') : t('benutzer.newTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saveError && <Alert variant="danger" className="mb-3">{saveError}</Alert>}
          <div className="row g-3">
            {/* === YENİ KULLANICI / DÜZENLEME FORMU === */}
            
            {/* Vorname */}
            <div className="col-6">
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
            <div className="col-6">
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

            {/* Email */}
            <div className="col-md-6">
              <Form.Label>{t('auth.email')} *</Form.Label>
              <Form.Control
                required
                type="email"
                isInvalid={!!fieldErrors.email}
                value={form.email}
                disabled={isEdit}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {fieldErrors.email && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('email')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Passwort (Only for New) */}
            {!isEdit && (
              <div className="col-md-6">
                <Form.Label>Passwort *</Form.Label>
                <Form.Control
                  required
                  type="password"
                  isInvalid={!!fieldErrors.passwort}
                  value={form.passwort}
                  onChange={(e) => setForm({ ...form, passwort: e.target.value })}
                  placeholder="min 8, A-z, 0-9, Sonderzeichen"
                />
                {fieldErrors.passwort && (
                  <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                    {getFieldError('passwort')}
                  </Form.Control.Feedback>
                )}
              </div>
            )}

            {/* Rolle */}
            <div className="col-md-4">
              <Form.Label>{t('benutzer.role')}</Form.Label>
              <Form.Select
                isInvalid={!!fieldErrors.rolle}
                value={form.rolle}
                onChange={(e) => setForm({ ...form, rolle: e.target.value })}
              >
                {rollen.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Form.Select>
              {fieldErrors.rolle && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('rolle')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Rufnummer */}
            <div className="col-md-4">
              <Form.Label>Rufnummer</Form.Label>
              <Form.Control
                isInvalid={!!fieldErrors.rufNummer}
                value={form.rufNummer}
                onChange={(e) => setForm({ ...form, rufNummer: e.target.value })}
              />
              {fieldErrors.rufNummer && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('rufNummer')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* Abteilung */}
            <div className="col-md-4">
              <Form.Label>Abteilung</Form.Label>
              <Form.Control
                isInvalid={!!fieldErrors.abteilung}
                value={form.abteilung}
                onChange={(e) => setForm({ ...form, abteilung: e.target.value })}
              />
              {fieldErrors.abteilung && (
                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                  {getFieldError('abteilung')}
                </Form.Control.Feedback>
              )}
            </div>

            {/* === PROFILBILD === */}
            <div className="col-12">
              <Form.Label>Profilbild</Form.Label>
              <div>
                {form.bild && !bildFile && (
                  <div className="mb-2 d-flex align-items-center gap-2">
                    <img
                      src={imageUrl(form.bild)}
                      alt="Avatar"
                      style={{ width: 56, height: 56, borderRadius: '10%', objectFit: 'cover', border: '1px solid #ddd' }}
                    />
                    <Button variant="outline-danger" size="sm" className="rounded-2" onClick={handleBildDelete}>
                      <i className="bi bi-trash" />
                    </Button>
                  </div>
                )}
                <div className="d-flex gap-2 align-items-center">
                  <Form.Control
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    ref={fileInputRef}
                    onChange={handleBildFileSelect}
                  />
                  {bildFile && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="rounded-2" 
                      onClick={handleBildRemoveSelection}
                      title="Seçimi kaldır"
                    >
                      <i className="bi bi-x-lg" />
                    </Button>
                  )}
                </div>
                {bildFile && (
                  <small className="text-success d-block mt-1">
                    <i className="bi bi-check-circle-fill me-1" />
                    {bildFile.name} seçildi. Kaydet butonuna bastığınızda yüklenecek.
                  </small>
                )}
                {bildError && <small className="text-danger d-block mt-1">{bildError}</small>}
                {!initial?.id && !bildFile && (
                  <small className="text-muted d-block mt-1">
                    <i className="bi bi-info-circle me-1" />
                    Avatar seçebilirsiniz. Kaydet butonuna bastığınızda tüm bilgilerle birlikte yüklenecektir.
                  </small>
                )}
              </div>
            </div>

            {/* === NOTLAR === */}
            <div className="col-12">
              <Form.Label>Hinweise</Form.Label>
              <Form.Control as="textarea" rows={2}
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