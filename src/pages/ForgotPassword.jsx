import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';


const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Validation
    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.PASSWORD.FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send reset email. Please try again.');
        setLoading(false);
        return;
      }

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 p-5">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl p-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password?</h1>
            <p className="text-sm text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
          </div>

          {success ? (
            <div className="text-center py-5">
              <div className="flex justify-center mb-5">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h2>
              <p className="text-sm text-gray-600 mb-2 leading-relaxed">If an account with that email exists, we've sent a password reset link to <strong className="text-gray-800 font-semibold">{email}</strong>.</p>
              <p className="text-xs text-gray-500 italic mb-6">Please check your inbox and click the link to reset your password.</p>
              <div className="mt-6">
                <button onClick={() => navigate('/login')} className="py-3 px-6 bg-[#4A90E2] text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-[#357ABD] hover:-translate-y-0.5 hover:shadow-lg">
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="px-3 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-800">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`px-4 py-3 border rounded-lg text-sm transition-all focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:cursor-not-allowed ${
                    error ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                  }`}
                  placeholder="Enter your email"
                  disabled={loading}
                  required
                />
              </div>

              <button type="submit" className="py-3 px-6 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all mt-2 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none" style={{ backgroundColor: loading ? '#9CA3AF' : '#4A90E2' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center mt-4">
                <Link to="/login" className="text-[#4A90E2] text-sm font-medium transition-colors hover:text-[#357ABD] hover:underline">
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

