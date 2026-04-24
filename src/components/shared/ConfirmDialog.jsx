// ============================================================================
// === IMPORTS ===
// ============================================================================
import { Button, Modal } from 'react-bootstrap';
import { useLanguage } from '../../hooks/useLanguage';

// ============================================================================
// === MAIN COMPONENT: CONFIRM DIALOG ===
// ============================================================================
export default function ConfirmDialog({
  show,
  title = 'Bitte bestaetigen',
  message = 'Sind Sie sicher?',
  confirmText = 'Loeschen',
  cancelText = 'Abbrechen',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const { t } = useLanguage();

  // ---------- RENDER ----------
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || t('common.confirm')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message || t('common.areYouSure')}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>{cancelText || t('common.cancel')}</Button>
        <Button variant={variant} onClick={onConfirm}>{confirmText || t('common.delete')}</Button>
      </Modal.Footer>
    </Modal>
  );
}