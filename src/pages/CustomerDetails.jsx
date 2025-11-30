import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';


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
    <div className="flex min-h-screen bg-gray-100">
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
        <div className="p-4 md:p-5 bg-gray-100 min-h-[calc(100vh-64px)] relative">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <span className="hover:text-gray-800 cursor-pointer" onClick={() => navigate('/customers')}>Customers</span>
            <span className="text-gray-400">›</span>
            <span className="text-gray-800 font-semibold">{customer.name}</span>
          </div>

          {/* Customer Info Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{customer.name}</h1>
              <p className="text-sm text-gray-600">{customer.email}</p>
            </div>
            <button 
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => navigate('/customers')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Customers
            </button>
          </div>

          {/* Section Title */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Services</h2>

          {/* View Services Button */}
          <div className="mb-6">
            <button 
              className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundColor: '#4A90E2' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#357ABD'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A90E2'}
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

