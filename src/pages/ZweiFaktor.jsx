import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    <div className="login-page-wrapper verify">
      <div className="login-box">
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="login-form">
            <div className="login-header">
              <h3>Bestätigungscode</h3>
            </div>
            <div className="login-body">
              <div className="verify-info">
                <i className="bi bi-envelope-check" />
                <div className="verify-desc">
                  <small>
                    Bitte geben Sie hier den <b>6-stelligen</b> Bestätigungscode ein, der an Ihre{' '}
                    <u>E-Mail-Adresse</u> gesendet wurde:
                  </small>
                </div>
              </div>

              <div className="login-field-group">
                <input
                  type="text"
                  className="login-input verify-code-input"
                  placeholder="Code eingeben"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoComplete="off"
                />
              </div>

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? 'wird überprüft...' : 'Verifizieren'}
              </button>

              {loading && (
                <div className="login-spinner-wrap">
                  <div className="login-spinner" />
                  <p>bitte Warten Sie ab...</p>
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

