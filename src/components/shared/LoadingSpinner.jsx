import { Spinner } from 'react-bootstrap';

export default function LoadingSpinner({ text = 'Laden...', className = 'py-5' }) {
  return (
    <div className={`text-center ${className}`}>
      <Spinner animation="border" role="status" />
      <div className="small text-muted mt-2">{text}</div>
    </div>
  );
}