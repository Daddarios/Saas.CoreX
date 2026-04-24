import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useLanguage } from '../hooks/useLanguage';

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.login(email, passwort);
      navigate('/verify', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.nachricht || err.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-box">
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="login-form">
            <div className="login-header">
              <h2>CoreX</h2>
            </div>
            <div className="login-body">
              <div className="login-field-group">
                <small>E-Mail</small>
                <input
                  type="email"
                  className="login-input"
                  placeholder="Ihre E-mail @"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="login-field-group login-field-password">
                <small>Passwort</small>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Ihre Passwort"
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <span
                  className="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  title="Passwort anzeigen/verbergen"
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                </span>
              </div>

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? 'Authentifizierung läuft...' : 'Login'}
              </button>

              {loading && (
                <div className="login-spinner-wrap">
                  <div className="login-spinner" />
                  <p>Bitte warten...</p>
                </div>
              )}
            </div>

            {error && (
              <ins className="login-error">
                {error} <i className="bi bi-exclamation-triangle" style={{ color: '#f14a1c' }} />
              </ins>
            )}
          </div>
        </form>
      </div>

      <footer className="login-footer">
        <p id="alt1">Vista CoreX</p>
        <p id="alt2">© {new Date().getFullYear()} All rights reserved</p>
      </footer>
    </div>
  );
}

