import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Container, Form, Modal, Spinner } from 'react-bootstrap';
import DataTable from '../components/shared/DataTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { berichtApi } from '../api/berichtApi';
import { useLanguage } from '../hooks/useLanguage';
import { usePermission } from '../hooks/usePermission';
import { ApiError } from '../api/errorHandler';

export default function Berichte() {
  const { t } = useLanguage();
  const { canDelete, canCreate } = usePermission(); // NurLesen için butonlar gizlenir
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const size = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await berichtApi.getAll(page, size);
      setData(res.data?.items || res.data || []);
      setTotal(res.data?.totalCount || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Berichte konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await berichtApi.delete(deleteId);
      setDeleteId(null);
      load();
    } catch { /* ignore */ }
  };

  const handleDownload = async (row) => {
    try {
      const res = await berichtApi.download(row.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = row.titel || 'bericht';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const handleView = async (row) => {
    try {
      const newTab = window.open('', '_blank');
      const res = await berichtApi.download(row.id);
      const url = URL.createObjectURL(res.data);
      newTab.location.href = url;
    } catch { /* ignore */ }
  };

  const columns = [
    { key: 'titel', label: 'Titel' },
    { key: 'dateiTyp', label: 'Typ' },
    { key: 'version', label: 'Version' },
    { key: 'hochgeladenAm', label: 'Hochgeladen', render: (r) => r.hochgeladenAm?.slice(0, 10) || '—' },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (row) => (
        <div className="d-flex gap-1">
          <Button size="sm" variant="outline-info" title="Anzeigen" onClick={() => handleView(row)}>
            <i className="bi bi-eye" />
          </Button>
          <Button size="sm" variant="outline-success" title="Herunterladen" onClick={() => handleDownload(row)}>
            <i className="bi bi-download" />
          </Button>
          {canDelete && <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(row.id)}>
            <i className="bi bi-trash" />
          </Button>}
        </div>
      ),
    },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Berichte</h2>
        {canCreate && <Button onClick={() => setShowUpload(true)}>
          <i className="bi bi-upload me-1" /> Hochladen
        </Button>}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <LoadingSpinner text="Berichte werden geladen..." />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          totalCount={total}
          page={page}
          size={size}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        show={!!deleteId}
        title="Bericht löschen"
        message="Möchten Sie diesen Bericht wirklich löschen?"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />

      {showUpload && (
        <UploadModal onHide={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); load(); }} />
      )}
    </Container>
  );
}

function UploadModal({ onHide, onSuccess }) {
  const { t } = useLanguage();
  const [entityType, setEntityType] = useState('kunden');
  const [kunden, setKunden] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [projekteFull, setProjekteFull] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketsFull, setTicketsFull] = useState([]);
  const [selectedKundeId, setSelectedKundeId] = useState('');
  const [entityId, setEntityId] = useState('');
  const [titel, setTitel] = useState('');
  const [version, setVersion] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown'ları yükle
  useEffect(() => {
    import('../api/kundeApi').then(({ kundeApi }) => {
      kundeApi.getAll(1, 200).then((res) => {
        setKunden(res.data?.items || res.data || []);
      }).catch(() => {});
    });
    import('../api/projektApi').then(({ projektApi }) => {
      projektApi.getAll(1, 200).then((res) => {
        setProjekteFull(res.data?.items || res.data || []);
      }).catch(() => {});
    });
    import('../api/ticketApi').then(({ ticketApi }) => {
      ticketApi.getAll(1, 200).then((res) => {
        setTicketsFull(res.data?.items || res.data || []);
      }).catch(() => {});
    });
  }, []);

  // Müşteri seçildiğinde projeleri ve ticketleri filtrele
  useEffect(() => {
    if (selectedKundeId) {
      setProjekte(projekteFull.filter(p => p.kundeId === selectedKundeId));
      setTickets(ticketsFull.filter(t => t.kundeId === selectedKundeId));
    } else {
      setProjekte([]);
      setTickets([]);
    }
  }, [selectedKundeId, projekteFull, ticketsFull]);

  // Entity type değiştiğinde entityId'yi sıfırla
  useEffect(() => {
    setEntityId('');
    setSelectedKundeId('');
  }, [entityType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !entityId.trim()) return;
    setError('');
    setUploading(true);
    
    // Backend modeline uygun payload
    const titelValue = titel.trim() || '';
    const versionValue = version.trim() || '1.0'; // Default version
    
    console.log('[Berichte] Uploading file:', {
      entityType,
      entityId: entityId.trim(),
      titel: titelValue,
      version: versionValue,
      fileName: file.name
    });
    
    try {
      await berichtApi.upload(
        entityType, 
        entityId.trim(), 
        file, 
        titelValue || file.name, // Eğer boşsa dosya adını kullan
        versionValue
      );
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getLocalizedMessage ? err.getLocalizedMessage() : err.message);
      } else {
        setError(err.response?.data?.message || 'Upload fehlgeschlagen.');
      }
      console.error('[Berichte] Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Datei hochladen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="mb-3">
            <Form.Label>Titel</Form.Label>
            <Form.Control
              placeholder="Bericht Titel"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <Form.Label>Version</Form.Label>
            <Form.Control
              placeholder="z.B. 1.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <Form.Label>Kategorie *</Form.Label>
            <Form.Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="kunden">Kunde</option>
              <option value="projekte">Projekt</option>
              <option value="tickets">Ticket</option>
            </Form.Select>
          </div>
          
          {/* MÜŞTERİ SEÇİMİ */}
          {entityType === 'kunden' && (
            <div className="mb-3">
              <Form.Label>Kunde auswählen *</Form.Label>
              <Form.Select 
                required
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              >
                <option value="">Bitte auswählen...</option>
                {kunden.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.unternehmen} — {k.vorname} {k.nachname}
                  </option>
                ))}
              </Form.Select>
            </div>
          )}

          {/* PROJE SEÇİMİ */}
          {entityType === 'projekte' && (
            <>
              <div className="mb-3">
                <Form.Label>Kunde auswählen *</Form.Label>
                <Form.Select 
                  required
                  value={selectedKundeId}
                  onChange={(e) => setSelectedKundeId(e.target.value)}
                >
                  <option value="">Bitte auswählen...</option>
                  {kunden.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.unternehmen} — {k.vorname} {k.nachname}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="mb-3">
                <Form.Label>Projekt auswählen *</Form.Label>
                <Form.Select 
                  required
                  disabled={!selectedKundeId || projekte.length === 0}
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                >
                  <option value="">
                    {!selectedKundeId 
                      ? 'Zuerst Kunde auswählen' 
                      : projekte.length === 0 
                        ? 'Keine Projekte verfügbar'
                        : 'Bitte auswählen...'
                    }
                  </option>
                  {projekte.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Form.Select>
              </div>
            </>
          )}

          {/* TICKET SEÇİMİ */}
          {entityType === 'tickets' && (
            <>
              <div className="mb-3">
                <Form.Label>Kunde auswählen *</Form.Label>
                <Form.Select 
                  required
                  value={selectedKundeId}
                  onChange={(e) => setSelectedKundeId(e.target.value)}
                >
                  <option value="">Bitte auswählen...</option>
                  {kunden.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.unternehmen} — {k.vorname} {k.nachname}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="mb-3">
                <Form.Label>Ticket auswählen *</Form.Label>
                <Form.Select 
                  required
                  disabled={!selectedKundeId || tickets.length === 0}
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                >
                  <option value="">
                    {!selectedKundeId 
                      ? 'Zuerst Kunde auswählen' 
                      : tickets.length === 0 
                        ? 'Keine Tickets verfügbar'
                        : 'Bitte auswählen...'
                    }
                  </option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>{t.titel}</option>
                  ))}
                </Form.Select>
              </div>
            </>
          )}
          <div className="mb-3">
            <Form.Label>Datei *</Form.Label>
            <Form.Control
              required
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={uploading}>
            {uploading ? <Spinner size="sm" className="me-1" /> : <i className="bi bi-upload me-1" />}
            Hochladen
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
