import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';
import './EditProfile.css';

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
      <div className="edit-profile-page">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
        <div className={`edit-profile-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Header onMenuClick={toggleSidebar} />
          <div className="edit-profile-content">
            <div className="edit-profile-container">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading profile...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-page">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`edit-profile-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="edit-profile-content">
          <div className="edit-profile-container">
            <div className="edit-profile-card">
              <div className="edit-profile-header">
                <button 
                  className="back-button"
                  onClick={() => navigate(-1)}
                  type="button"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h1>Edit Profile</h1>
              </div>

              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="form-success">
                  Profile updated successfully! Redirecting...
                </div>
              )}

              <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? 'error' : ''}
                    placeholder="Enter your full name"
                    disabled={loading}
                    required
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'error' : ''}
                    placeholder="Enter your email"
                    disabled={loading}
                    required
                  />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="profile_photo_url">Profile Photo URL</label>
                  <input
                    type="url"
                    id="profile_photo_url"
                    name="profile_photo_url"
                    value={formData.profile_photo_url}
                    onChange={handleChange}
                    className={errors.profile_photo_url ? 'error' : ''}
                    placeholder="https://example.com/photo.jpg"
                    disabled={loading}
                  />
                  {errors.profile_photo_url && (
                    <span className="field-error">{errors.profile_photo_url}</span>
                  )}
                  <p className="field-hint">Leave empty to use default avatar</p>
                </div>

                {formData.profile_photo_url && (
                  <div className="profile-preview">
                    <label>Preview</label>
                    <div className="preview-image">
                      <img 
                        src={formData.profile_photo_url} 
                        alt="Profile preview" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="preview-error" style={{ display: 'none' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p>Invalid image URL</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => navigate(-1)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-save"
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

