import { useEffect, useState, useCallback } from 'react';
import { Container, Button, Modal, Form, Alert, Badge, Collapse } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { projektApi } from '../api/projektApi';
import { kundeApi } from '../api/kundeApi';
import { benutzerApi } from '../api/benutzerApi';
import { ansprechpartnerApi } from '../api/ansprechpartnerApi';
import { useLanguage } from '../hooks/useLanguage';
import { parseApiError, ApiError } from '../api/errorHandler';
import { usePermission } from '../hooks/usePermission';

const statusOptions = ['NichtGestartet', 'InBearbeitung', 'Abgeschlossen', 'Pausiert'];
const prioritaetOptions = ['Niedrig', 'Mittel', 'Hoch', 'Kritisch'];

export default function Projekte() {
  const { t } = useLanguage();
  const { canEdit, canDelete, canCreate } = usePermission(); // NurLesen için butonlar gizlenir
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
      const benutzerIds = formData.benutzerIds || [];
      const ansprechpartnerIds = formData.ansprechpartnerIds || [];
      // benutzerIds ve ansprechpartnerIds'i payload'dan çıkar (backend modelde yok)
      const { benutzerIds: _, ansprechpartnerIds: __, ...projektData } = formData;
      
      let projektId;
      if (editItem) {
        await projektApi.update(editItem.id, projektData);
        projektId = editItem.id;
      } else {
        const res = await projektApi.create(projektData);
        projektId = res.data?.id || res.data;
        console.log('[Projekte] Created project with ID:', projektId);
      }
      
      // Benutzer atamaları yap
      if (benutzerIds.length > 0 && projektId) {
        console.log(`[Projekte] Assigning ${benutzerIds.length} benutzer to project ${projektId}`);
        for (const benutzerId of benutzerIds) {
          try {
            await projektApi.assignBenutzer(projektId, benutzerId);
          } catch (err) {
            console.error(`[Projekte] Failed to assign benutzer ${benutzerId}:`, err);
          }
        }
      }
      
      // Ansprechpartner atamaları yap
      if (ansprechpartnerIds.length > 0 && projektId) {
        console.log(`[Projekte] Assigning ${ansprechpartnerIds.length} ansprechpartner to project ${projektId}`);
        for (const ansprechpartnerId of ansprechpartnerIds) {
          try {
            await projektApi.assignAnsprechpartner(projektId, ansprechpartnerId);
          } catch (err) {
            console.error(`[Projekte] Failed to assign ansprechpartner ${ansprechpartnerId}:`, err);
          }
        }
      }
      
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage(t));
      } else {
        setError(t('projekte.saveError', 'Speichern fehlgeschlagen'));
      }
      console.error('[Projekte] Save error:', err);
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
          {canEdit && <Button size="sm" variant="outline-primary" className="me-1"
            onClick={() => { setEditItem(row); setShowModal(true); }}><i className="bi bi-pencil" /></Button>}
          {canDelete && <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(row.id)}><i className="bi bi-trash" /></Button>}
        </>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{t('projekte.title')}</h2>
        {canCreate && <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1" /> {t('projekte.new')}
        </Button>}
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
  const [kunden, setKunden] = useState([]);
  const [benutzer, setBenutzer] = useState([]);
  const [filialen, setFilialen] = useState([]);
  const [ansprechpartner, setAnsprechpartner] = useState([]);
  const [form, setForm] = useState({
    name: '', beschreibung: '', startdatum: '', enddatum: '',
    status: 'NichtGestartet', prioritaet: 'Mittel', abschlussInProzent: 0,
    kundeId: '', istAbgeschlossen: false,
  });
  const [selectedBenutzerIds, setSelectedBenutzerIds] = useState([]);
  const [showBenutzerList, setShowBenutzerList] = useState(false);
  const [selectedAnsprechpartnerIds, setSelectedAnsprechpartnerIds] = useState([]);
  const [showAnsprechpartnerList, setShowAnsprechpartnerList] = useState(false);

  useEffect(() => {
    if (show) {
      kundeApi.getAll(1, 200).then((res) => {
        setKunden(res.data?.items || res.data || []);
        console.log('[Projekte] Loaded kunden:', res.data?.items?.length || res.data?.length || 0);
      }).catch((err) => {
        console.error('[Projekte] Failed to load kunden:', err);
      });
      
      benutzerApi.getAll(1, 200).then((res) => {
        const benutzerList = res.data?.items || res.data || [];
        setBenutzer(benutzerList);
        console.log('[Projekte] Loaded benutzer:', benutzerList.length, benutzerList);
      }).catch((err) => {
        console.error('[Projekte] Failed to load benutzer:', err);
        setBenutzer([]);
      });
    }
  }, [show]);

  // Müşteri seçildiğinde ilgili bilgileri yükle
  useEffect(() => {
    if (form.kundeId) {
      // Filiale'leri yükle
      import('../api/filialeApi').then(({ filialeApi }) => {
        filialeApi.getByKunde(form.kundeId)
          .then((res) => {
            setFilialen(res.data || []);
            console.log(`[Projekte] Loaded ${res.data?.length || 0} filialen for kunde ${form.kundeId}`);
          })
          .catch((err) => {
            console.error('[Projekte] Failed to load filialen:', err);
            setFilialen([]);
          });
      });

      // Ansprechpartner'leri yükle
      ansprechpartnerApi.getByKunde(form.kundeId)
        .then((res) => {
          setAnsprechpartner(res.data || []);
          console.log(`[Projekte] Loaded ${res.data?.length || 0} ansprechpartner for kunde ${form.kundeId}`);
        })
        .catch((err) => {
          console.error('[Projekte] Failed to load ansprechpartner:', err);
          setAnsprechpartner([]);
        });
    } else {
      setFilialen([]);
      setAnsprechpartner([]);
    }
  }, [form.kundeId]);

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
        kundeId: initial.kundeId || '',
        istAbgeschlossen: initial.istAbgeschlossen ?? false,
      });
      // Mevcut benutzer'ları yükle
      setSelectedBenutzerIds(initial.benutzer?.map(b => b.id) || []);
      // Mevcut ansprechpartner'ları yükle
      setSelectedAnsprechpartnerIds(initial.ansprechpartner?.map(ap => ap.id) || []);
    } else {
      setForm({ name: '', beschreibung: '', startdatum: '', enddatum: '',
        status: 'NichtGestartet', prioritaet: 'Mittel', abschlussInProzent: 0, kundeId: '', istAbgeschlossen: false });
      setSelectedBenutzerIds([]);
      setSelectedAnsprechpartnerIds([]);
    }
    // Toggle listelerini kapat
    setShowBenutzerList(false);
    setShowAnsprechpartnerList(false);
  }, [initial, show]);

  const handleKundeChange = (kundeId) => {
    setForm({ ...form, kundeId });
    // Müşteri değiştiğinde önceki müşteriye ait seçili ansprechpartner'leri temizle
    setSelectedAnsprechpartnerIds([]);
    // Ansprechpartner listesini kapat
    setShowAnsprechpartnerList(false);
  };

  const handleBenutzerToggle = (benutzerId) => {
    setSelectedBenutzerIds(prev => {
      if (prev.includes(benutzerId)) {
        return prev.filter(id => id !== benutzerId);
      } else {
        return [...prev, benutzerId];
      }
    });
  };

  const handleAnsprechpartnerToggle = (ansprechpartnerId) => {
    setSelectedAnsprechpartnerIds(prev => {
      if (prev.includes(ansprechpartnerId)) {
        return prev.filter(id => id !== ansprechpartnerId);
      } else {
        return [...prev, ansprechpartnerId];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // En az 1 benutzer kontrolu
    if (selectedBenutzerIds.length === 0) {
      alert(t('projekte.minOneUser', 'Bitte mindestens einen Benutzer auswählen!'));
      return;
    }
    
    // En az 1 ansprechpartner kontrolu (sadece müşteri seçildiyse)
    if (form.kundeId && selectedAnsprechpartnerIds.length === 0) {
      alert(t('projekte.minOneAnsprechpartner', 'Bitte mindestens einen Ansprechpartner auswählen!'));
      return;
    }
    
    // Boş string gönder (NULL değil) - backend zorunlu alanlar için
    const payload = {};
    Object.entries(form).forEach(([key, value]) => {
      if (typeof value === 'string') {
        payload[key] = value.trim();
      } else {
        payload[key] = value;
      }
    });
    
    // Benutzer ID'lerini ekle
    payload.benutzerIds = selectedBenutzerIds;
    
    // Ansprechpartner ID'lerini ekle
    if (selectedAnsprechpartnerIds.length > 0) {
      payload.ansprechpartnerIds = selectedAnsprechpartnerIds;
    }
    
    console.log('[Projekte] Submitting payload:', payload);
    onSave(payload);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial ? t('projekte.editTitle') : t('projekte.newTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3">
            {/* === KUNDE VE ANSPRECHPARTNER YAN YANA === */}
            <div className="col-md-6">
              <Form.Label><i className="bi bi-people-fill me-1"></i>{t('kunden.title')} *</Form.Label>
              <Form.Select required value={form.kundeId}
                onChange={(e) => handleKundeChange(e.target.value)}>
                <option value="" disabled>{t('--')}</option>
                {kunden.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.unternehmen} 
                  </option>
                ))}
              </Form.Select>
            </div>

            {/* === ANSPRECHPARTNER TOGGLE (SAĞ TARAF) === */}
            {form.kundeId && (
              <div className="col-md-6">
                <Form.Label><i className="bi bi-person-lines-fill me-1"></i>{t('projekte.ansprechpartner', 'Ansprechpartner')} *</Form.Label>
                <Button
                  variant="outline-success"
                  className="w-100 d-flex justify-content-between align-items-center"
                  onClick={() => setShowAnsprechpartnerList(!showAnsprechpartnerList)}
                  aria-controls="ansprechpartner-collapse"
                  aria-expanded={showAnsprechpartnerList}
                >
                  <span className="d-flex align-items-center gap-2">
                    <Badge bg={selectedAnsprechpartnerIds.length === 0 ? 'danger' : 'success'}>
                      {selectedAnsprechpartnerIds.length} {t('common.selected', 'ausgewählt')}
                    </Badge>
                  </span>
                  <i className={`bi bi-chevron-${showAnsprechpartnerList ? 'up' : 'down'}`} />
                </Button>
              </div>
            )}

            {/* === LOGO + BİLGİLER (AYRI SATIR) === */}
            {form.kundeId && (() => {
              const selectedKunde = kunden.find(k => k.id === form.kundeId);
              return (
                <div className="col-12">
                  <div className="d-flex align-items-center gap-3 p-3  rounded">
                    {selectedKunde?.logo ? (
                      <img 
                        src={`http://localhost:8080${selectedKunde.logo}`} 
                        alt={selectedKunde.unternehmen}
                        style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }}
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center bg-white border rounded" 
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-building text-muted fs-4" />
                      </div>
                    )}
                    <div>
                      <strong className="d-block">{selectedKunde?.unternehmen}</strong>
                      <Form.Text className="text-muted small">
                        {filialen.length} Filiale(n)
                        {ansprechpartner.length > 0 && `, ${ansprechpartner.length} Ansprechpartner`}
                      </Form.Text>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* === ANSPRECHPARTNER LISTE (COLLAPSED) === */}
            {form.kundeId && (
              <div className="col-12">
                <Collapse in={showAnsprechpartnerList}>
                  <div id="ansprechpartner-collapse">
                    <div className="border rounded p-3 bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {ansprechpartner.length === 0 ? (
                        <div className="text-muted small text-center py-2">
                          <i className="bi bi-exclamation-circle me-2" />
                          Keine Ansprechpartner verfügbar
                        </div>
                      ) : (
                        ansprechpartner.map((ap) => (
                          <Form.Check
                            key={ap.id}
                            type="checkbox"
                            id={`ansprechpartner-${ap.id}`}
                            label={
                              <span>
                                <strong>{ap.name}</strong>
                                {ap.abteilung && <span className="text-muted ms-2">({ap.abteilung})</span>}
                                {ap.telefon && <span className="text-muted small d-block"><i className="bi bi-telephone" /> {ap.telefon}</span>}
                                {ap.email && <span className="text-muted small d-block"><i className="bi bi-envelope" /> {ap.email}</span>}
                              </span>
                            }
                            checked={selectedAnsprechpartnerIds.includes(ap.id)}
                            onChange={() => handleAnsprechpartnerToggle(ap.id)}
                            className="mb-2 pb-2 border-bottom"
                          />
                        ))
                      )}
                    </div>
                  </div>
                </Collapse>
                
                {selectedAnsprechpartnerIds.length === 0 && (
                  <Form.Text className="text-danger small d-block mt-2">
                    <i className="bi bi-exclamation-triangle-fill me-1" />
                    {t('projekte.minOneAnsprechpartner', 'Mindestens ein Ansprechpartner muss zugewiesen werden!')}
                  </Form.Text>
                )}
              </div>
            )}

            {/* === NAME ALANI === */}
            <div className="col-12">
              <Form.Label><i className='bi bi-clipboard-data me-1'></i>{t('projekte.name')} *</Form.Label>
              <Form.Control required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label><i className="bi bi-card-text me-1"></i>{t('projekte.description')}</Form.Label>
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
              <Form.Label className="d-flex justify-content-between align-items-center">
                <span>{t('projekte.completion')}</span>
                <Badge bg={
                  form.abschlussInProzent < 30 ? 'danger' : 
                  form.abschlussInProzent < 70 ? 'warning' : 
                  'success'
                }>
                  {form.abschlussInProzent}%
                </Badge>
              </Form.Label>
              <Form.Range 
                min={0} 
                max={100} 
                step={5}
                value={form.abschlussInProzent}
                onChange={(e) => setForm({ ...form, abschlussInProzent: +e.target.value })}
                className="mb-2"
              />
              <div className="progress w-50" style={{ height: '7px' }}>
                <div 
                  className={`progress-bar ${
                    form.abschlussInProzent < 30 ? 'bg-danger' : 
                    form.abschlussInProzent < 70 ? 'bg-warning' : 
                    'bg-success'
                  }`} 
                  role="progressbar" 
                  style={{ width: `${form.abschlussInProzent}%` }}
                
                  aria-valuenow={form.abschlussInProzent} 
                  aria-valuemin={0} 
                  aria-valuemax={100}
                />
              </div>
            </div>
            {/*<div className="col-md-4 d-flex align-items-end">
              <Form.Check
                type="checkbox"
                id="ist-abgeschlossen"
                label="Abgeschlossen"
                checked={form.istAbgeschlossen}
                onChange={(e) => setForm({ ...form, istAbgeschlossen: e.target.checked })}
              />
            </div> */}

            {/* === BENUTZER AUSWAHL (ZORUNLU - TOGGLE LIST) === */}
            <div className="col-12 mt-4">
              <Button
                variant="outline-primary"
                className="w-100 d-flex justify-content-between align-items-center mb-2"
                onClick={() => setShowBenutzerList(!showBenutzerList)}
                aria-controls="benutzer-collapse"
                aria-expanded={showBenutzerList}
              >
                <span className="d-flex align-items-center gap-2">
                  <i className="bi bi-people-fill" />
                  {t('projekte.assignedUsers', 'Zugewiesene Benutzer')} *
                  <Badge bg={selectedBenutzerIds.length === 0 ? 'danger' : 'success'}>
                    {selectedBenutzerIds.length} {t('common.selected', 'ausgewählt')}
                  </Badge>
                </span>
                <i className={`bi bi-chevron-${showBenutzerList ? 'up' : 'down'}`} />
              </Button>
              
              <Collapse in={showBenutzerList}>
                <div id="benutzer-collapse">
                  <div className="border rounded p-3 bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {benutzer.length === 0 ? (
                      <div className="text-muted small text-center py-2">
                        <i className="bi bi-exclamation-circle me-2" />
                        {t('benutzer.noUsers', 'Keine Benutzer verfügbar')}
                      </div>
                    ) : (
                      benutzer.map((b) => (
                        <Form.Check
                          key={b.id}
                          type="checkbox"
                          id={`benutzer-${b.id}`}
                          label={
                            <span>
                              <strong>{b.vorname} {b.nachname}</strong>
                              {b.abteilung && <span className="text-muted ms-2">({b.abteilung})</span>}
                              {b.email && <span className="text-muted small d-block">{b.email}</span>}
                            </span>
                          }
                          checked={selectedBenutzerIds.includes(b.id)}
                          onChange={() => handleBenutzerToggle(b.id)}
                          className="mb-2 pb-2 border-bottom"
                        />
                      ))
                    )}
                  </div>
                </div>
              </Collapse>
              
              {selectedBenutzerIds.length === 0 && (
                <Form.Text className="text-danger small d-block mt-2">
                  <i className="bi bi-exclamation-triangle-fill me-1" />
                  {t('projekte.minOneUser', 'Mindestens ein Benutzer muss zugewiesen werden!')}
                </Form.Text>
              )}
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
