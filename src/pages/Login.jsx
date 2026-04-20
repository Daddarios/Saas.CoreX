import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { authApi } from '../api/authApi';
import { useLanguage } from '../hooks/useLanguage';

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.login(email, passwort);
      // 2FA code gönderildi → ZweiFaktor sayfasına yönlendir
      navigate('/verify', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.nachricht || err.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100">
      <Card style={{ width: '100%', maxWidth: '420px' }} className="shadow">
        <Card.Body className="p-4">
          <h3 className="text-center mb-4">🏢 {t('auth.loginTitle')}</h3>
          <p className="text-center text-muted mb-4">{t('auth.signIn')}</p>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('auth.email')}</Form.Label>
              <Form.Control
                type="email"
                placeholder="name@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('auth.password')}</Form.Label>
              <Form.Control
                type="password"
                placeholder="••••••••"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" /> : t('auth.signIn')}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
