import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import './SetPassword.css';

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenType, setTokenType] = useState(null);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    // Verify token
    const verifyToken = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.PASSWORD.VERIFY_TOKEN(token));
        const data = await response.json();

        if (data.success) {
          setUserInfo(data.data);
          setTokenType(data.data.tokenType);
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors = {};
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Use appropriate endpoint based on token type
      const endpoint = tokenType === 'password_reset' 
        ? API_ENDPOINTS.PASSWORD.RESET_PASSWORD 
        : API_ENDPOINTS.PASSWORD.SET_PASSWORD;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ submit: data.message || 'Failed to set password' });
        setLoading(false);
        return;
      }

      if (data.success) {
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Error setting password:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="set-password-page">
        <div className="set-password-container">
          <div className="set-password-card">
            <div className="verifying">
              <p>Verifying token...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="set-password-page">
        <div className="set-password-container">
          <div className="set-password-card">
            <div className="error-state">
              <h2>Invalid or Expired Link</h2>
              <p>The password setup link is invalid or has expired.</p>
              <p>Please contact your administrator for a new link.</p>
              <button onClick={() => navigate('/login')} className="btn-back-login">
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="set-password-page">
      <div className="set-password-container">
        <div className="set-password-card">
          <div className="set-password-header">
            <h1>{tokenType === 'password_reset' ? 'Reset Your Password' : 'Set Your Password'}</h1>
            {userInfo && (
              <p>
                Hello {userInfo.name}, 
                {tokenType === 'password_reset' 
                  ? ' please enter your new password below.' 
                  : ' please set your password to continue.'}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="set-password-form">
            <div className="form-group">
              <label htmlFor="password">New Password <span className="required">*</span></label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? 'error' : ''}
                placeholder="Enter your password"
                required
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password <span className="required">*</span></label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
                required
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            {errors.submit && (
              <div className="form-error">
                {errors.submit}
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;

