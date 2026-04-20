import { Spinner } from 'react-bootstrap';
import { useLanguage } from '../../hooks/useLanguage';

export default function LoadingSpinner({ text = 'Laden...', className = 'py-5' }) {
  const { t } = useLanguage();

  return (
    <div className={`text-center ${className}`}>
      <Spinner animation="border" role="status" />
      <div className="small text-muted mt-2">{text || t('common.loading')}</div>
    </div>
  );
}