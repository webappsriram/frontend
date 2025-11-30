import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';


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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 p-5">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl p-10 shadow-2xl">
            <div className="text-center py-10">
              <p className="text-base text-gray-600">Verifying token...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 p-5">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl p-10 shadow-2xl">
            <div className="text-center py-5">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Invalid or Expired Link</h2>
              <p className="text-sm text-gray-600 mb-2">The password setup link is invalid or has expired.</p>
              <p className="text-sm text-gray-600 mb-6">Please contact your administrator for a new link.</p>
              <button onClick={() => navigate('/login')} className="py-3 px-6 bg-[#4A90E2] text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-[#357ABD] hover:-translate-y-0.5 hover:shadow-lg">
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 p-5">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl p-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{tokenType === 'password_reset' ? 'Reset Your Password' : 'Set Your Password'}</h1>
            {userInfo && (
              <p className="text-sm text-gray-600">
                Hello {userInfo.name}, 
                {tokenType === 'password_reset' 
                  ? ' please enter your new password below.' 
                  : ' please set your password to continue.'}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-800">New Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`px-4 py-3 border rounded-lg text-sm transition-all focus:outline-none focus:ring-4 ${
                  errors.password ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                }`}
                placeholder="Enter your password"
                required
              />
              {errors.password && <span className="text-xs text-red-600 -mt-1">{errors.password}</span>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-800">Confirm Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`px-4 py-3 border rounded-lg text-sm transition-all focus:outline-none focus:ring-4 ${
                  errors.confirmPassword ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                }`}
                placeholder="Confirm your password"
                required
              />
              {errors.confirmPassword && <span className="text-xs text-red-600 -mt-1">{errors.confirmPassword}</span>}
            </div>

            {errors.submit && (
              <div className="px-3 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {errors.submit}
              </div>
            )}

            <button type="submit" className="py-3 px-6 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all mt-2 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none" style={{ backgroundColor: loading ? '#9CA3AF' : '#4A90E2' }} disabled={loading}>
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;

