// ============================================================================
// === IMPORTS ===
// ============================================================================
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Container, Button, Modal, Form, Alert, ListGroup, Spinner, Badge } from 'react-bootstrap';
import '../styles/Kunden.css';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { kundeApi } from '../api/kundeApi';
import { ansprechpartnerApi } from '../api/ansprechpartnerApi';
import { projektApi } from '../api/projektApi';
import { useLanguage } from '../hooks/useLanguage';
import { ApiError } from '../api/errorHandler';
import { usePermission } from '../hooks/usePermission';
import { API_ORIGIN } from '../api/axiosClient';

// ============================================================================
// === CONSTANTS & HELPERS ===
// ============================================================================
const STORAGE_URL = API_ORIGIN;
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
  const [projekteKunde, setProjekteKunde] = useState(null);
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
      let response;
      if (editItem) {
        response = await kundeApi.update(editItem.id, formData);
      } else {
        response = await kundeApi.create(formData);
      }
      // Response'u return et ki modal içinde kullanabilelim
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage(t));
      } else {
        setError(t('kunden.saveError'));
      }
      throw err; // Hatayı yukarı fırlat ki modal handle edebilsin
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

  // ---------- STATS ----------
  const miniStats = useMemo(() => {
    const withLogo = data.filter(d => d.logo).length;
    const withEmail = data.filter(d => d.email).length;
    return [
      { label: 'Gesamt', value: total, icon: 'bi-people-fill', bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
      { label: 'Mit Logo', value: withLogo, icon: 'bi-image', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      { label: 'Mit E-Mail', value: withEmail, icon: 'bi-envelope-fill', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
      { label: 'Auf Seite', value: data.length, icon: 'bi-list-ul', bg: 'rgba(6,182,212,0.1)', color: '#06b6d4' },
    ];
  }, [data, total]);

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
      label: '',
      render: (row) => (
        <div className="d-flex gap-1 justify-content-end">
          <button className="kunden-action-btn info" title="Ansprechpartner"
            onClick={() => setAnsprechpartnerKunde(row)}>
            <i className="bi bi-person-lines-fill" />
          </button>
          <button className="kunden-action-btn success" title="Projekte"
            onClick={() => setProjekteKunde(row)}>
            <i className="bi bi-folder2-open" />
          </button>
          {canEdit && (
            <button className="kunden-action-btn primary" title="Bearbeiten"
              onClick={() => { setEditItem(row); setShowModal(true); }}>
              <i className="bi bi-pencil" />
            </button>
          )}
          {canDelete && (
            <button className="kunden-action-btn danger" title="Löschen"
              onClick={() => setDeleteId(row.id)}>
              <i className="bi bi-trash3" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ---------- RENDER ----------
  return (
    <div className="kunden-root">
      {/* ── HEADER ── */}
      <div className="kunden-header">
        <div className="kunden-header-content">
          <div className="kunden-header-left">
            <div className="kunden-header-icon">
              <i className="bi bi-people-fill" />
            </div>
            <div className="kunden-header-text">
              <h2>{t('kunden.title')}</h2>
              <p className="kunden-header-subtitle">{total} {t('kunden.title')} insgesamt</p>
            </div>
          </div>
          <div className="kunden-header-actions">
            {canCreate && (
              <button className="kunden-new-btn" onClick={() => { setEditItem(null); setShowModal(true); }}>
                <i className="bi bi-plus-lg" /> {t('kunden.new')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MINI STATS ── */}
      <div className="kunden-stats-row">
        {miniStats.map((s, i) => (
          <div key={i} className="kunden-mini-stat">
            <div className="kunden-mini-stat-icon" style={{ background: s.bg, color: s.color }}>
              <i className={`bi ${s.icon}`} />
            </div>
            <div>
              <div className="kunden-mini-stat-value">{s.value}</div>
              <div className="kunden-mini-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}

      {/* === TABLE === */}
      <div className="kunden-table-wrapper">
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
      </div>

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

      {/* === PROJEKTE MODAL === */}
      {projekteKunde && (
        <ProjekteModal
          kunde={projekteKunde}
          onHide={() => setProjekteKunde(null)}
        />
      )}
    </div>
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

  const handleLogoDelete = async () => {
    if (!initial?.id) return;
    setLogoError('');
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

  const handleLogoRemoveSelection = () => {
    setLogoFile(null);
    setLogoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------- HANDLERS: FORM SUBMIT ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setLogoError('');

    // Logo'yu payload'dan çıkar ve diğer alanları hazırla
    const { logo: _logo, ...rest } = form;

    // Payload oluştur: Tüm string alanları boş string olarak gönder (NULL değil!)
    const payload = {};

    Object.entries(rest).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Başındaki/sonundaki boşlukları temizle
        const trimmed = value.trim();
        // Boş bile olsa string olarak gönder (backend zorunlu alanlar için "" bekliyor)
        payload[key] = trimmed;  // "" veya "değer"
      } else {
        // String olmayan alanlar (örn: number, boolean)
        payload[key] = value ?? '';
      }
    });

    console.log('[Kunden] Submitting payload:', payload);

    try {
      // 1. Önce müşteri bilgilerini kaydet (create veya update)
      const response = await onSave(payload);

      // 2. Eğer logo dosyası seçilmişse, şimdi yükle
      if (logoFile) {
        // Müşteri ID'sini al (düzenleme modunda initial'dan, yeni kayıtta response'dan)
        const customerId = initial?.id || response?.data?.id;

        if (customerId) {
          try {
            await kundeApi.uploadLogo(customerId, logoFile);
          } catch (logoErr) {
            // Logo yükleme hatası - ama müşteri kaydedildi
            if (logoErr instanceof ApiError) {
              setLogoError(`Müşteri kaydedildi ancak logo yüklenemedi: ${logoErr.message}`);
            } else {
              setLogoError('Müşteri kaydedildi ancak logo yüklenemedi');
            }
            setSaving(false);
            // Refresh yap ve modal'ı açık tut ki kullanıcı tekrar deneyebilsin
            if (onRefresh) await onRefresh();
            return;
          }
        }
      }

      // Her şey başarılı - listeyi yenile ve modal'ı kapat
      if (onRefresh) await onRefresh();
      onHide();
      setSaving(false);

    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError) {
        // Backend'den gelen alan bazlı hatalar
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
          console.error('[Kunden] Field validation errors:', err.fieldErrors);
        }
        // Genel hata mesajı
        if (err.message) {
          console.error('[Kunden] Save error:', err.message);
        }
      } else {
        console.error('[Kunden] Unexpected error:', err);
      }
      // Error parent component'e de bildirilecek
      throw err;
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
              <Form.Label>{t('kunden.firstName')}</Form.Label>
              <Form.Control
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
              <Form.Label>{t('kunden.lastName')}</Form.Label>
              <Form.Control
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
              <div>
                {/* Mevcut Logo Gösterimi (Düzenleme Modu) */}
                {form.logo && !logoFile && (
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

                {/* Dosya Seçimi */}
                <div className="d-flex gap-2 align-items-center">
                  <Form.Control
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    ref={fileInputRef}
                    onChange={handleLogoFileSelect}
                  />
                  {logoFile && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="rounded-2"
                      onClick={handleLogoRemoveSelection}
                      title="Seçimi kaldır"
                    >
                      <i className="bi bi-x-lg" />
                    </Button>
                  )}
                </div>

                {/* Logo Seçildi Mesajı */}
                {logoFile && (
                  <small className="text-success d-block mt-1">
                    <i className="bi bi-check-circle-fill me-1" />
                    {logoFile.name} seçildi. Kaydet butonuna bastığınızda yüklenecek.
                  </small>
                )}

                {/* Hata Mesajı */}
                {logoError && <small className="text-danger d-block mt-1">{logoError}</small>}

                {/* Bilgilendirme */}
                {!initial?.id && !logoFile && (
                  <small className="text-muted d-block mt-1">
                    <i className="bi bi-info-circle me-1" />
                    Logo seçebilirsiniz. Kaydet butonuna bastığınızda tüm bilgilerle birlikte yüklenecektir.
                  </small>
                )}
              </div>
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
  const [filialen, setFilialen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', telefon: '', email: '', abteilung: '', filialeId: '' });
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

  const loadFilialen = useCallback(async () => {
    try {
      const { filialeApi } = await import('../api/filialeApi');
      const res = await filialeApi.getByKunde(kunde.id);
      setFilialen(res.data || []);
    } catch (err) {
      console.error('[Ansprechpartner] Filialen load error:', err);
    }
  }, [kunde.id]);

  useEffect(() => {
    load();
    loadFilialen();
  }, [load, loadFilialen]);

  // ---------- HANDLERS ----------
  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', telefon: '', email: '', abteilung: '', filialeId: '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      telefon: item.telefon || '',
      email: item.email || '',
      abteilung: item.abteilung || '',
      filialeId: item.filialeId || ''
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Backend modeline uygun payload
      const payload = {
        name: form.name.trim(),
        telefon: form.telefon.trim(),
        email: form.email.trim(),
        abteilung: form.abteilung.trim(),
        filialeId: form.filialeId || null,
        kundeId: kunde.id
      };
      console.log('[Ansprechpartner] Saving:', payload);

      if (editItem) {
        await ansprechpartnerApi.update(editItem.id, payload);
      } else {
        await ansprechpartnerApi.create(payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      console.error('[Ansprechpartner] Save error:', err);
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
                        {item.filiale && (
                          <span className="ms-2">
                            <Badge bg="secondary" className="fw-normal small">
                              <i className="bi bi-building me-1" />{item.filiale.name}
                            </Badge>
                          </span>
                        )}
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
                    <div className="col-12">
                      <Form.Label>Filiale</Form.Label>
                      <Form.Select
                        value={form.filialeId}
                        onChange={(e) => setForm({ ...form, filialeId: e.target.value })}
                      >
                        <option value="">{t('common.select', 'Auswählen')}...</option>
                        {filialen.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} {f.adresse && `— ${f.adresse}`}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted small">
                        Optional: Ordnen Sie diesen Ansprechpartner einer bestimmten Filiale zu
                      </Form.Text>
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

// ============================================================================
// === MODAL: PROJEKTE LIST ===
// ============================================================================
function ProjekteModal({ kunde, onHide }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // ---------- STATE MANAGEMENT ----------
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- EFFECTS & CALLBACKS ----------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[ProjekteModal] Loading projects for Kunde ID:', kunde.id);
      const res = await projektApi.getByKunde(kunde.id);
      console.log('[ProjekteModal] API Response:', res.data);

      // Backend kundeId filtresi desteklemiyorsa, frontend'te filtrele
      let projects = res.data?.items || res.data || [];

      // Eğer backend filtreleme yapmadıysa, manuel filtrele
      const filteredProjects = projects.filter(p => p.kundeId === kunde.id);

      console.log('[ProjekteModal] Total projects:', projects.length);
      console.log('[ProjekteModal] Filtered projects for kunde:', filteredProjects.length);

      setList(filteredProjects);
    } catch (err) {
      console.error('[ProjekteModal] Load error:', err);
    }
    setLoading(false);
  }, [kunde.id]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- STATUS BADGE HELPER ----------
  const getStatusColor = (status) => {
    switch (status) {
      case 'NichtGestartet': return 'secondary';
      case 'InBearbeitung': return 'primary';
      case 'Abgeschlossen': return 'success';
      case 'Pausiert': return 'warning';
      default: return 'secondary';
    }
  };

  const getPrioritaetColor = (prioritaet) => {
    switch (prioritaet) {
      case 'Niedrig': return 'info';
      case 'Mittel': return 'primary';
      case 'Hoch': return 'warning';
      case 'Kritisch': return 'danger';
      default: return 'secondary';
    }
  };

  // ---------- RENDER ----------
  return (
    <Modal show onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center mb-2 mt-2 w-100 ">
          {/* Sol: Projects yazısı */}
          <span className="me-auto"><i className="bi bi-folder2-open me-2"></i>{t('projekte.projekteFor')}</span>

          {/* Orta: Logo + Unternehmen */}
          <div className="d-flex align-items-center gap-2 position-absolute start-50 translate-middle-x">
            {kunde.logo ? (
              <img
                src={imageUrl(kunde.logo)}
                alt="Logo"
                style={{ maxHeight: 32, maxWidth: 64, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }}
              />
            ) : (
              <i className="bi bi-folder" />
            )}
            <span>{kunde.unternehmen}</span>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-3"><Spinner size="sm" /></div>
        ) : (
          <>
            {list.length === 0 ? (
              <div className="text-center py-3 text-muted">
                <i className="bi bi-folder-x fs-1 d-block mb-2" />
                {t('projekte.noProjects')}
              </div>
            ) : (
              <ListGroup>
                {list.map((item) => (
                  <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <strong className="fs-6">{item.name}</strong>
                        <Badge bg={getStatusColor(item.status)} className="fw-normal small">
                          {item.status}
                        </Badge>
                        <Badge bg={getPrioritaetColor(item.prioritaet)} className="fw-normal small">
                          {item.prioritaet}
                        </Badge>
                      </div>
                      {item.beschreibung && (
                        <p className="mb-1 text-muted small">{item.beschreibung}</p>
                      )}

                      {/* Atanan Kullanıcılar (Yetkililer) */}
                      {item.benutzer && item.benutzer.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted me-2">
                            <i className="bi bi-people-fill me-1" />
                            {t('projekte.assignedUsers', 'Yetkililer')}:
                          </small>
                          {item.benutzer.map((user) => (
                            <Badge
                              key={user.id}
                              bg="info"
                              className="me-1 fw-normal"
                              style={{ fontSize: '0.75rem' }}
                            >
                              <i className="bi bi-person-fill me-1" />
                              {user.vorname} {user.nachname}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="small text-muted">
                        {item.startdatum && (
                          <span className="me-3">
                            <i className="bi bi-calendar-event me-1" />
                            {item.startdatum.slice(0, 10)}
                          </span>
                        )}
                        {item.enddatum && (
                          <span className="me-3">
                            <i className="bi bi-calendar-check me-1" />
                            {item.enddatum.slice(0, 10)}
                          </span>
                        )}
                        {item.abschlussInProzent != null && (
                          <span>
                            <i className="bi bi-speedometer2 me-1" />
                            {item.abschlussInProzent}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="d-flex flex-column align-items-end gap-2">
                      {item.istAbgeschlossen && (
                        <Badge bg="success">
                          <i className="bi bi-check-circle-fill me-1" />
                          Abgeschlossen
                        </Badge>
                      )}
                      {/* Projeye Git Butonu */}
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="rounded-2"
                        onClick={() => {
                          onHide();
                          navigate('/projekte', { state: { selectedProjectId: item.id } });
                        }}
                        title="Projeye Git"
                      >
                        <i className="bi bi-arrow-right me-1" />
                        {t('projekte.goToProject', 'Projeye Git')}
                      </Button>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" className="rounded-2" onClick={onHide}>
          {t('common.close', 'Schließen')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
