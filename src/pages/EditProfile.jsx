import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';


const EditProfile = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile_photo_url: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.user) {
          setFormData({
            name: data.data.user.name || '',
            email: data.data.user.email || '',
            profile_photo_url: data.data.user.profile_photo_url || '',
          });
        }
      } else {
        setError('Failed to load profile. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Network error. Please check if the server is running.');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    // Clear success message when user starts typing
    if (success) {
      setSuccess(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.profile_photo_url && formData.profile_photo_url.trim()) {
      try {
        new URL(formData.profile_photo_url);
      } catch (e) {
        newErrors.profile_photo_url = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.AUTH.UPDATE_PROFILE, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          profile_photo_url: formData.profile_photo_url.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to update profile. Please try again.');
        setLoading(false);
        return;
      }

      if (data.success) {
        setSuccess(true);
        // Refresh the page after a short delay to show updated profile
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(data.message || 'Failed to update profile. Please try again.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (fetching) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[240px]'
        }`}>
          <Header onMenuClick={toggleSidebar} />
          <div className="flex-1 p-10 overflow-y-auto">
            <div className="max-w-[600px] mx-auto">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-[#4A90E2] rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 text-sm">Loading profile...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[240px]'
        }`}>
          <Header onMenuClick={toggleSidebar} />
          <div className="flex-1 p-10 overflow-y-auto">
            <div className="max-w-[600px] mx-auto">
              <div className="bg-white rounded-xl p-8 shadow-md">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200">
                <button 
                  className="flex items-center justify-center w-10 h-10 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all"
                  onClick={() => navigate(-1)}
                  type="button"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 m-0">Edit Profile</h1>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-6">
                  {error}
                </div>
              )}

              {success && (
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm mb-6">
                  Profile updated successfully! Redirecting...
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-semibold text-gray-800">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`px-4 py-3 border rounded-lg text-sm font-inherit transition-all focus:outline-none focus:ring-4 bg-white ${
                      errors.name ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="Enter your full name"
                    disabled={loading}
                    required
                  />
                  {errors.name && <span className="text-xs text-red-600 -mt-1">{errors.name}</span>}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-semibold text-gray-800">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`px-4 py-3 border rounded-lg text-sm font-inherit transition-all focus:outline-none focus:ring-4 bg-white ${
                      errors.email ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="Enter your email"
                    disabled={loading}
                    required
                  />
                  {errors.email && <span className="text-xs text-red-600 -mt-1">{errors.email}</span>}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="profile_photo_url" className="text-sm font-semibold text-gray-800">Profile Photo URL</label>
                  <input
                    type="url"
                    id="profile_photo_url"
                    name="profile_photo_url"
                    value={formData.profile_photo_url}
                    onChange={handleChange}
                    className={`px-4 py-3 border rounded-lg text-sm font-inherit transition-all focus:outline-none focus:ring-4 bg-white ${
                      errors.profile_photo_url ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="https://example.com/photo.jpg"
                    disabled={loading}
                  />
                  {errors.profile_photo_url && (
                    <span className="text-xs text-red-600 -mt-1">{errors.profile_photo_url}</span>
                  )}
                  <p className="text-xs text-gray-500 m-0 -mt-1">Leave empty to use default avatar</p>
                </div>

                {formData.profile_photo_url && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-800">Preview</label>
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
                      <img 
                        src={formData.profile_photo_url} 
                        alt="Profile preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden flex-col items-center justify-center text-gray-400" style={{ display: 'none' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p className="text-xs mt-2">Invalid image URL</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50 w-full sm:w-auto"
                    onClick={() => navigate(-1)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none w-full sm:w-auto"
                    style={{ backgroundColor: loading ? '#9CA3AF' : '#4A90E2' }}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;

