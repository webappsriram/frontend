import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { removeAuthToken, getAuthToken, hasRole } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';
import './Sidebar.css';

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
        <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>
      )}
      <aside className={`sidebar ${!isOpen ? 'mobile-hidden' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="12" height="12" rx="2" fill="#FF6B35"/>
              <rect x="16" y="4" width="12" height="12" rx="2" fill="#4A90E2"/>
              <rect x="4" y="16" width="12" height="12" rx="2" fill="#4A90E2"/>
              <rect x="16" y="16" width="12" height="12" rx="2" fill="#FF6B35"/>
            </svg>
          </div>
        </div>
        <button className="sidebar-toggle" onClick={onToggleCollapse} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {isCollapsed ? (
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && (
                <span className="nav-label">{item.label}</span>
              )}
              {isCollapsed && (
                <span className="nav-tooltip">{item.label}</span>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

