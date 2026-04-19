import { Button, Modal } from 'react-bootstrap';

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
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>{cancelText}</Button>
        <Button variant={variant} onClick={onConfirm}>{confirmText}</Button>
      </Modal.Footer>
    </Modal>
  );
}