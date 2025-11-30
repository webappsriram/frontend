import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { setAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
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
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      if (data.success) {
        // Store token
        setAuthToken(data.data.token);
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check if the server is running.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 p-5">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10 md:p-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl" style={{ backgroundColor: '#4A90E2' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4A90E2"/>
                <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="#4A90E2"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-800">SriRam Service</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-600">Sign in to continue to your account</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm text-center border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-semibold text-gray-800">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-all focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-semibold text-gray-800">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-all focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end items-center text-sm">
            <Link to="/forgot-password" className="font-semibold hover:underline transition-colors" style={{ color: '#4A90E2' }} onMouseEnter={(e) => e.currentTarget.style.color = '#357ABD'} onMouseLeave={(e) => e.currentTarget.style.color = '#4A90E2'}>
              Forgot Password?
            </Link>
          </div>

          <button 
            type="submit" 
            className="text-white border-none py-3.5 px-6 rounded-lg text-base font-semibold cursor-pointer transition-all mt-2 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
            style={{ backgroundColor: loading ? '#9CA3AF' : '#4A90E2' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#357ABD')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4A90E2')}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

