import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { removeAuthToken, isAuthenticated, getAuthToken, getUserFromToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const profileRef = useRef(null);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated()) {
        setIsLoadingProfile(false);
        return;
      }

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
            setUserProfile(data.data.user);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to token data if API fails
        const tokenUser = getUserFromToken();
        if (tokenUser) {
          setUserProfile({
            name: tokenUser.name || 'User',
            role: tokenUser.role || 'user',
            email: tokenUser.email || ''
          });
        }
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const toggleProfileDropdown = (e) => {
    e.stopPropagation();
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowProfileDropdown(false);
    
    // Call logout API
    try {
      const token = getAuthToken();
      if (token) {
        // Fire and forget - don't wait for response
        fetch(API_ENDPOINTS.AUTH.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => {
          console.error('Logout API error:', err);
        });
      }
    } catch (error) {
      console.error('Error calling logout API:', error);
    }
    
    // Remove token and redirect immediately (don't wait for API)
    removeAuthToken();
    navigate('/login');
  };

  const handleEditProfile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowProfileDropdown(false);
    navigate('/profile/edit');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleSignOut = () => {
    removeAuthToken();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center">
        <button 
          className="md:hidden p-2 mr-3 text-gray-800 hover:bg-gray-100 rounded transition-colors" 
          onClick={onMenuClick} 
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-md" style={{ backgroundColor: '#4A90E2' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4A90E2"/>
              <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="#4A90E2"/>
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-800">SriRam E-SevaiMaiyam</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-5">
        <div className="relative p-2 cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C8.067 2 6.5 3.567 6.5 5.5V9.5C6.5 12.5 5 14 2 14H18C15 14 13.5 12.5 13.5 9.5V5.5C13.5 3.567 11.933 2 10 2Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.5 14V15.5C7.5 16.8807 8.61929 18 10 18C11.3807 18 12.5 16.8807 12.5 15.5V14" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="absolute top-1 right-1 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center" style={{ backgroundColor: '#4A90E2' }}>2</span>
        </div>
        <div className="relative" ref={profileRef}>
          <div 
            className="flex items-center gap-3 cursor-pointer select-none hover:opacity-80 transition-opacity"
            onClick={toggleProfileDropdown}
          >
            <div className="hidden md:flex flex-col">
              <div className="text-sm font-semibold text-gray-800">
                {isLoadingProfile ? 'Loading...' : (userProfile?.name || 'User')}
              </div>
              <div className="text-xs text-gray-600">
                {isLoadingProfile ? '' : (userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1).replace('_', ' ') : 'User')}
              </div>
            </div>
            <svg 
              className={`text-gray-600 transition-transform flex-shrink-0 ${showProfileDropdown ? 'rotate-180' : ''}`}
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none"
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {showProfileDropdown && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg min-w-[180px] py-2 border border-gray-200 z-[1000] animate-in fade-in slide-in-from-top-2">
              <button 
                className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-gray-800 hover:bg-gray-50 transition-colors group" 
                style={{ '--hover-color': '#4A90E2' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#4A90E2'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}
                onClick={handleEditProfile}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-600 group-hover:text-[#4A90E2] transition-colors">
                  <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="flex-1">Edit Profile</span>
              </button>
              <button 
                className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-gray-800 hover:bg-gray-50 transition-colors group"
                style={{ '--hover-color': '#4A90E2' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#4A90E2'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}
                onClick={handleLogout}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-600 group-hover:text-[#4A90E2] transition-colors">
                  <path d="M6 12L2 8M2 8L6 4M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="flex-1">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

