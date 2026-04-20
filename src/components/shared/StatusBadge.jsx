import { Badge } from 'react-bootstrap';
import { useLanguage } from '../../hooks/useLanguage';

const statusColors = {
  // Ticket
  Offen: 'primary',
  InBearbeitung: 'warning',
  Geloest: 'success',
  Geschlossen: 'secondary',
  // Projekt
  NichtGestartet: 'secondary',
  Abgeschlossen: 'success',
  Pausiert: 'info',
  // Prioritaet
  Niedrig: 'info',
  Mittel: 'warning',
  Hoch: 'danger',
  Kritisch: 'dark',
};

const statusLabels = {
  Offen: 'Offen',
  InBearbeitung: 'In Bearbeitung',
  Geloest: 'Gelöst',
  Geschlossen: 'Geschlossen',
  NichtGestartet: 'Nicht gestartet',
  Abgeschlossen: 'Abgeschlossen',
  Pausiert: 'Pausiert',
  Niedrig: 'Niedrig',
  Mittel: 'Mittel',
  Hoch: 'Hoch',
  Kritisch: 'Kritisch',
};

export default function StatusBadge({ value }) {
  const { t } = useLanguage();
  const color = statusColors[value] || 'secondary';
  const label = t(`status.${value}`, statusLabels[value] || value);

  return <Badge bg={color}>{label}</Badge>;
}
