import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { removeAuthToken, getAuthToken, hasRole } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Base menu items (visible to all users)
  const baseMenuItems = [
    { icon: '📊', label: 'Dashboard', path: '/dashboard' },
    { icon: '📄', label: 'Sales', path: '/sales' },
    { icon: '👥', label: 'Customer', path: '/customers' },
    // { icon: '📦', label: 'Order', path: '/orders' },
    // { icon: '🛍️', label: 'Product', path: '/products' },
    // { icon: '👔', label: 'Employee', path: '/employees' },
    // { icon: '💳', label: 'Billing', path: '/billing' },
    // { icon: '📈', label: 'Analytics', path: '/analytics' },
    // { icon: '❓', label: 'Help', path: '/help' },
  ];

  // Settings menu item (only for admin and master_user)
  const settingsMenuItem = { 
    icon: '⚙️', 
    label: 'Setting', 
    path: '/settings',
    requiredRoles: ['admin', 'master_user']
  };

  // Filter menu items based on user role
  const getMenuItems = () => {
    const items = [...baseMenuItems];
    
    // Add Settings only if user has admin or master_user role
    if (hasRole('admin', 'master_user')) {
      items.push(settingsMenuItem);
    }
    
    return items;
  };

  const menuItems = getMenuItems();

  // Check if a menu item is active based on current URL
  const isActive = (itemPath) => {
    if (!itemPath) return false;
    // Exact match
    if (location.pathname === itemPath) return true;
    // For nested routes, check if pathname starts with the item path
    if (location.pathname.startsWith(itemPath) && itemPath !== '/') return true;
    return false;
  };

  const handleLogout = async () => {
    // Call logout API
    try {
      const token = getAuthToken();
      if (token) {
        // Fire and forget - don't wait for response
        fetch(`${API_ENDPOINTS.AUTH.LOGOUT || 'http://localhost:5001/api/auth/logout'}`, {
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

  const handleItemClick = (item) => {
    // Navigate to the path if provided
    if (item.path) {
      navigate(item.path);
    }
    // Close sidebar on mobile when item is clicked
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className={`fixed inset-0 bg-black/50 z-[199] transition-opacity duration-300 md:hidden ${
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`} 
          onClick={onClose}
        ></div>
      )}
      <aside className={`
        fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-[200]
        transition-all duration-300 overflow-visible
        ${!isOpen ? 'md:translate-x-0 -translate-x-full' : 'translate-x-0'}
        ${isCollapsed ? 'w-[70px]' : 'w-[240px]'}
        md:translate-x-0
      `}>
        <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-100 relative">
          <div className="w-10 h-10 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="12" height="12" rx="2" fill="#FF6B35"/>
              <rect x="16" y="4" width="12" height="12" rx="2" fill="#4A90E2"/>
              <rect x="4" y="16" width="12" height="12" rx="2" fill="#4A90E2"/>
              <rect x="16" y="16" width="12" height="12" rx="2" fill="#FF6B35"/>
            </svg>
          </div>
        </div>
        <button 
          className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center cursor-pointer shadow-md z-[202] transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-lg hidden md:flex"
          onClick={onToggleCollapse} 
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {isCollapsed ? (
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden min-h-0">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`
                flex items-center gap-3 px-4 py-3 my-1 cursor-pointer transition-all rounded-lg relative
                ${isActive(item.path) 
                  ? 'text-white font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }
                ${isCollapsed ? 'justify-center px-3' : ''}
              `}
              style={isActive(item.path) ? { backgroundColor: '#4A90E2' } : {}}
              onMouseEnter={(e) => !isActive(item.path) && (e.currentTarget.style.backgroundColor = '#f9fafb')}
              onMouseLeave={(e) => !isActive(item.path) && (e.currentTarget.style.backgroundColor = 'transparent')}
              onClick={() => handleItemClick(item)}
            >
              <span className="text-xl w-6 h-6 flex items-center justify-center flex-shrink-0">
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="flex-1 text-sm font-medium">{item.label}</span>
              )}
              {isCollapsed && (
                <span className="absolute left-full ml-3 bg-gray-800 text-white px-3 py-1.5 rounded-md text-xs whitespace-nowrap opacity-0 invisible pointer-events-none transition-opacity z-[1000] shadow-lg group-hover:opacity-100 group-hover:visible">
                  {item.label}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-6 border-transparent border-r-gray-800"></span>
                </span>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

