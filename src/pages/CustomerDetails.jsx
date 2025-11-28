import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';
import './CustomerDetails.css';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.CUSTOMERS.BY_ID(id), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.customer) {
          setCustomer(data.data.customer);
        }
      } else {
        console.error('Failed to fetch customer');
        navigate('/customers');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      navigate('/customers');
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="customer-details-page">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={closeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
        <div className={`customer-details-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Header onMenuClick={toggleSidebar} />
          <div className="loading-container">
            <p>Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="customer-details-page">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`customer-details-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="customer-details-content">
          {/* Breadcrumbs */}
          <div className="breadcrumbs">
            <span className="breadcrumb-item" onClick={() => navigate('/customers')}>Customers</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-item active">{customer.name}</span>
          </div>

          {/* Customer Info Header */}
          <div className="customer-info-header">
            <div>
              <h1 className="page-title">{customer.name}</h1>
              <p className="customer-email">{customer.email}</p>
            </div>
            <button className="btn-back" onClick={() => navigate('/customers')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Customers
            </button>
          </div>

          {/* Section Title */}
          <h2 className="section-title">Services</h2>

          {/* View Services Button */}
          <div className="services-navigation">
            <button 
              className="btn-view-services" 
              onClick={() => navigate(`/customers/${id}/services`)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>View Services</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;

