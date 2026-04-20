import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { authApi } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';

export default function ZweiFaktor() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const email = location.state?.email || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.verifyCode(email, code);
      login(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    navigate('/login');
    return null;
  }

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100">
      <Card style={{ width: '100%', maxWidth: '420px' }} className="shadow">
        <Card.Body className="p-4">
          <h3 className="text-center mb-3">🔐 {t('auth.twoFactor')}</h3>
          <p className="text-center text-muted mb-4">
            {t('auth.codeSent')} <strong>{email}</strong>.
          </p>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('auth.codeLabel')}</Form.Label>
              <Form.Control
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center fs-4 letter-spacing-2"
                required
              />
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" /> : t('auth.verify')}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
