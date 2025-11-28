import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { hasRole, getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';
import './Settings.css';

const Settings = () => {
  // On mobile, sidebar starts closed. On desktop, it's always open
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('service');
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseAmount: ''
  });
  const [formFields, setFormFields] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceCurrentPage, setServiceCurrentPage] = useState(1);
  const [servicePagination, setServicePagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const serviceItemsPerPage = 10;
  
  // User management state
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'user'
  });
  const [userErrors, setUserErrors] = useState({});
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Fetch services from API
  useEffect(() => {
    if (activeTab === 'service') {
      fetchServices(serviceCurrentPage);
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, serviceCurrentPage]);

  const fetchServices = async (page = 1) => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_ENDPOINTS.SERVICES.BASE}?page=${page}&limit=${serviceItemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setServices(data.data.services || []);
          if (data.data.pagination) {
            setServicePagination(data.data.pagination);
          }
        }
      } else {
        console.error('Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search - reset to page 1 when search changes
  useEffect(() => {
    if (activeTab === 'service' && searchQuery && serviceCurrentPage !== 1) {
      setServiceCurrentPage(1);
    }
  }, [searchQuery, activeTab]);

  // Filter services based on search query (client-side filtering for now)
  // Note: For better performance with large datasets, move search to backend
  const filteredServices = services.filter(service => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      service.name.toLowerCase().includes(query) ||
      (service.description && service.description.toLowerCase().includes(query))
    );
  });

  const handleServicePageChange = (page) => {
    setServiceCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const url = editingServiceId 
        ? API_ENDPOINTS.SERVICES.BY_ID(editingServiceId)
        : API_ENDPOINTS.SERVICES.BASE;
      
      const method = editingServiceId ? 'PUT' : 'POST';

      // Prepare request body with form schema
      // Normalize fields to ensure options are in the right format
      const normalizedFields = formFields.map(field => {
        const normalized = { ...field };
        // Ensure options are in field.options (not just config.options)
        if (field.type === 'select') {
          const options = field.options || field.config?.options || [];
          normalized.options = options;
          // Keep config for other settings like formula
          if (field.config && field.config.formula) {
            normalized.config = { formula: field.config.formula };
          }
        }
        return normalized;
      });
      
      const requestBody = {
        ...formData,
        formSchema: normalizedFields.length > 0 ? {
          fields: normalizedFields
        } : null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowModal(false);
          resetForm();
          fetchServices();
        }
      } else {
        const data = await response.json();
        if (data.message) {
          setErrors({ submit: data.message });
        } else {
          setErrors({ submit: 'Failed to save service' });
        }
      }
    } catch (error) {
      console.error('Error saving service:', error);
      setErrors({ submit: 'An error occurred while saving the service' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditService = (service) => {
    setEditingServiceId(service.id);
    setFormData({
      name: service.name || '',
      description: service.description || '',
      baseAmount: service.baseAmount || service.base_amount || ''
    });
    // Normalize fields to ensure options are accessible
    const normalizedFields = (service.formSchema?.fields || []).map(field => {
      const normalized = { ...field };
      // Ensure options are accessible from both locations
      if (field.type === 'select' && !normalized.options && normalized.config?.options) {
        normalized.options = normalized.config.options;
      }
      return normalized;
    });
    setFormFields(normalizedFields);
    setErrors({});
    setShowModal(true);
  };

  const handleDeleteService = async (service) => {
    if (!window.confirm(`Are you sure you want to delete "${service.name}"?`)) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.SERVICES.BY_ID(service.id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchServices();
      } else {
        alert('Failed to delete service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('An error occurred while deleting the service');
    }
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setShowModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      baseAmount: ''
    });
    setFormFields([]);
    setErrors({});
    setEditingServiceId(null);
  };

  // Predefined field names
  const predefinedFieldNames = [
    { value: 'customer_name', label: 'Customer Name' },
    { value: 'customer_email', label: 'Customer Email' },
    { value: 'customer_phone', label: 'Customer Phone' },
    { value: 'amount', label: 'Amount' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'price', label: 'Price' },
    { value: 'total', label: 'Total' },
    { value: 'date', label: 'Date' },
    { value: 'description', label: 'Description' },
    { value: 'notes', label: 'Notes' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'category', label: 'Category' },
    { value: 'location', label: 'Location' },
    { value: 'reference_number', label: 'Reference Number' },
  ];

  // Form Builder Functions
  const addFormField = () => {
    setFormFields([...formFields, {
      name: '',
      label: '',
      type: 'text',
      required: false,
      defaultValue: '',
      config: { formula: '', options: [] }
    }]);
  };

  const addSelectOption = (fieldIndex) => {
    const field = formFields[fieldIndex];
    const options = field.options || field.config?.options || [];
    const newOptions = [...options, { value: '', label: '' }];
    updateFormField(fieldIndex, {
      options: newOptions,
      config: { ...(field.config || {}), options: newOptions }
    });
  };

  const removeSelectOption = (fieldIndex, optionIndex) => {
    const field = formFields[fieldIndex];
    const options = field.options || field.config?.options || [];
    const newOptions = options.filter((_, i) => i !== optionIndex);
    updateFormField(fieldIndex, {
      options: newOptions,
      config: { ...(field.config || {}), options: newOptions }
    });
  };

  const updateSelectOption = (fieldIndex, optionIndex, option) => {
    const field = formFields[fieldIndex];
    const options = field.options || field.config?.options || [];
    const newOptions = [...options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], ...option };
    updateFormField(fieldIndex, {
      options: newOptions,
      config: { ...(field.config || {}), options: newOptions }
    });
  };

  const removeFormField = (index) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const updateFormField = (index, field) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], ...field };
    setFormFields(updated);
  };

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'number', label: 'Number' },
    { value: 'integer', label: 'Integer' },
    { value: 'decimal', label: 'Decimal' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select/Dropdown' },
    { value: 'custom', label: 'Custom (Formula)' }
  ];

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.USERS.BASE, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.users) {
          setUsers(data.data.users);
        }
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = userSearchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const handleUserChange = (e) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (userErrors[name]) {
      setUserErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!userFormData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!userFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userFormData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setUserErrors(newErrors);
      return;
    }

    setIsSubmittingUser(true);
    try {
      const token = getAuthToken();
      const url = editingUserId 
        ? API_ENDPOINTS.USERS.BY_ID(editingUserId)
        : API_ENDPOINTS.USERS.BASE;
      
      const method = editingUserId ? 'PUT' : 'POST';

      // Prepare request body (password is not needed)
      const requestBody = { ...userFormData };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowUserModal(false);
          resetUserForm();
          fetchUsers();
        }
      } else {
        const data = await response.json();
        if (data.message) {
          setUserErrors({ submit: data.message });
        } else {
          setUserErrors({ submit: 'Failed to save user' });
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setUserErrors({ submit: 'An error occurred while saving the user' });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setUserFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user'
    });
    setUserErrors({});
    setShowUserModal(true);
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete "${user.name}" (${user.email})?`)) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.USERS.BY_ID(user.id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('An error occurred while deleting the user');
    }
  };

  const handleCloseUserModal = () => {
    if (!isSubmittingUser) {
      setShowUserModal(false);
      resetUserForm();
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      role: 'user'
    });
    setUserErrors({});
    setEditingUserId(null);
  };

  const tabs = [
    { id: 'service', label: 'Service' },
    { id: 'users', label: 'Users' }
  ];

  return (
    <div className="settings-page">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`settings-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="settings-content">
          <div className="settings-header">
            <h1>Settings</h1>
            <p>Manage your application settings</p>
          </div>

          <div className="settings-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="settings-tab-content">
            {activeTab === 'users' && (
              <div className="users-tab">
                {/* Section Title */}
                <h2 className="section-title">User List</h2>

                {/* Search and Add Button Bar */}
                <div className="customers-toolbar">
                  <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 19L14.65 14.65" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  {hasRole('admin', 'master_user') && (
                    <button className="btn-add-customer" onClick={() => {
                      setEditingUserId(null);
                      setShowUserModal(true);
                    }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Add User</span>
                    </button>
                  )}
                </div>

                {/* Users Table */}
                <div className="services-table-card">
                  <div className="services-table-container">
                    <div className="services-table-header">
                      <div className="services-table-cell">Name</div>
                      <div className="services-table-cell">Email</div>
                      <div className="services-table-cell">Role</div>
                      <div className="services-table-cell">Actions</div>
                    </div>
                    <div className="services-table-body">
                      {isLoadingUsers ? (
                        <div className="services-table-empty">
                          <p>Loading users...</p>
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="services-table-empty">
                          <p>No users found</p>
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div key={user.id} className="services-table-row">
                            <div className="services-table-cell" data-label="Name">{user.name}</div>
                            <div className="services-table-cell" data-label="Email">{user.email}</div>
                            <div className="services-table-cell" data-label="Role">
                              <span className={`status-badge status-${user.role?.toLowerCase().replace(/_/g, '-') || 'user'}`}>
                                {user.role || 'user'}
                              </span>
                            </div>
                            <div className="services-table-cell" data-label="Actions">
                              <div className="services-action-buttons">
                                {hasRole('admin', 'master_user') && (
                                  <>
                                    <button className="services-action-btn" title="Edit" onClick={() => handleEditUser(user)}>
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                    <button className="services-action-btn services-action-btn-delete" title="Delete" onClick={() => handleDeleteUser(user)}>
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'service' && (
              <div className="service-tab">
                {/* Section Title */}
                <h2 className="section-title">Service List</h2>

                {/* Search and Add Button Bar */}
                <div className="customers-toolbar">
                  <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 19L14.65 14.65" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  {hasRole('admin', 'master_user') && (
                    <button className="btn-add-customer" onClick={() => {
                      setEditingServiceId(null);
                      setShowModal(true);
                    }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Add Service</span>
                    </button>
                  )}
                </div>

                {/* Services Table */}
                <div className="services-table-card">
                  <div className="services-table-container">
                    <div className="services-table-header">
                      <div className="services-table-cell">Service Name</div>
                      <div className="services-table-cell">Actions</div>
                    </div>
                    <div className="services-table-body">
                      {isLoading ? (
                        <div className="services-table-empty">
                          <p>Loading services...</p>
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <div className="services-table-empty">
                          <p>No services found</p>
                        </div>
                      ) : (
                        filteredServices.map((service) => (
                          <div key={service.id} className="services-table-row">
                            <div className="services-table-cell" data-label="Service Name">{service.name}</div>
                            <div className="services-table-cell" data-label="Actions">
                              <div className="services-action-buttons">
                                {hasRole('admin', 'master_user') && (
                                  <>
                                    <button className="services-action-btn" title="Edit" onClick={() => handleEditService(service)}>
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                    <button className="services-action-btn services-action-btn-delete" title="Delete" onClick={() => handleDeleteService(service)}>
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  {!isLoading && servicePagination.total > 0 && (
                    <Pagination
                      currentPage={serviceCurrentPage}
                      totalPages={servicePagination.totalPages}
                      onPageChange={handleServicePageChange}
                      totalItems={servicePagination.total}
                      itemsPerPage={serviceItemsPerPage}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingServiceId ? 'Edit Service' : 'Add Service'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <form className="customer-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Service Name */}
                <div className="form-group">
                  <label htmlFor="name">Service Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? 'error' : ''}
                    placeholder="Enter service name"
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                {/* Description */}
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className={errors.description ? 'error' : ''}
                    placeholder="Enter service description (optional)"
                    rows="4"
                  />
                  {errors.description && <span className="error-message">{errors.description}</span>}
                </div>

                {/* Base Amount */}
                <div className="form-group">
                  <label htmlFor="baseAmount">Base Amount (₹)</label>
                  <input
                    type="number"
                    id="baseAmount"
                    name="baseAmount"
                    value={formData.baseAmount}
                    onChange={handleChange}
                    className={errors.baseAmount ? 'error' : ''}
                    placeholder="Enter base amount (default price)"
                    min="0"
                    step="0.01"
                  />
                  {errors.baseAmount && <span className="error-message">{errors.baseAmount}</span>}
                  <small className="form-hint">This will be used as the default unit price when adding this service to invoices</small>
                </div>
              </div>

              {/* Form Builder Section */}
              <div className="form-builder-section">
                <div className="form-builder-header">
                  <h3 className="form-builder-title">Form Fields</h3>
                  <button type="button" className="btn-add-field" onClick={addFormField}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Add Field
                  </button>
                </div>

                {formFields.length === 0 ? (
                  <div className="form-builder-empty">
                    <p>No fields added yet. Click "Add Field" to create form fields.</p>
                    <p className="form-builder-hint">Each field will become a column in the service table.</p>
                  </div>
                ) : (
                  <div className="form-fields-list">
                    {formFields.slice().reverse().map((field, reversedIndex) => {
                      const originalIndex = formFields.length - 1 - reversedIndex;
                      return (
                      <div key={originalIndex} className="form-field-card">
                        <div className="form-field-card-header">
                          <span className="field-number">Field {originalIndex + 1}</span>
                          <button
                            type="button"
                            className="btn-remove-field"
                            onClick={() => removeFormField(originalIndex)}
                            title="Remove field"
                          >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                        <div className="form-field-card-body">
                          <div className="form-field-grid">
                            <div className="form-group">
                              <label className="form-field-label">Field Name <span className="required">*</span></label>
                              <input
                                type="text"
                                value={field.name || ''}
                                onChange={(e) => updateFormField(originalIndex, { name: e.target.value })}
                                placeholder="Enter field name (e.g., customer_name)"
                                required
                                className="form-field-input"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-field-label">Field Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateFormField(originalIndex, { label: e.target.value })}
                                placeholder="e.g., Customer Name"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-field-label">Field Type <span className="required">*</span></label>
                              <select
                                value={field.type}
                                onChange={(e) => {
                                  const newType = e.target.value;
                                  const updates = { type: newType };
                                  // Initialize options array when switching to select type
                                  if (newType === 'select' && !field.options && !field.config?.options) {
                                    updates.options = [];
                                    updates.config = { ...(field.config || {}), options: [] };
                                  }
                                  updateFormField(originalIndex, updates);
                                }}
                                required
                              >
                                {fieldTypes.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-field-label">Default Value</label>
                              <input
                                type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'}
                                value={field.defaultValue}
                                onChange={(e) => updateFormField(originalIndex, { defaultValue: e.target.value })}
                                placeholder="Optional default value"
                                disabled={field.type === 'custom'}
                              />
                            </div>
                          </div>
                          {field.type === 'custom' && (
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                              <label>Formula <span className="required">*</span></label>
                              <textarea
                                value={field.config?.formula || ''}
                                onChange={(e) => updateFormField(originalIndex, { 
                                  config: { ...(field.config || {}), formula: e.target.value }
                                })}
                                placeholder="e.g., {field1} + {field2} or {field1} * {field2}"
                                rows={3}
                                required
                                style={{ fontFamily: 'monospace' }}
                              />
                              <div className="formula-hint">
                                <p style={{ margin: '8px 0 4px 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Available operations:</strong> +, -, *, /, ( )
                                </p>
                                <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                                  <strong>Reference fields:</strong> Use {'{'}fieldName{'}'} to reference other fields
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Available fields:</strong>{' '}
                                  {formFields
                                    .filter((f, i) => i !== originalIndex && f.name && f.type !== 'custom')
                                    .map(f => `{${f.name}}`)
                                    .join(', ') || 'None (add other fields first)'}
                                </p>
                              </div>
                            </div>
                          )}
                          {field.type === 'select' && (
                            <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                              <div className="select-options-header">
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>Dropdown Options</label>
                                <button
                                  type="button"
                                  className="btn-add-option"
                                  onClick={() => addSelectOption(originalIndex)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Add Option
                                </button>
                              </div>
                              <div className="select-options-list">
                                {(field.options || field.config?.options || []).length === 0 ? (
                                  <div className="select-options-empty">
                                    <p>No options added. Click "Add Option" to add dropdown values.</p>
                                  </div>
                                ) : (
                                  (field.options || field.config?.options || []).map((option, optIndex) => (
                                    <div key={optIndex} className="select-option-item">
                                      <div className="select-option-inputs">
                                        <input
                                          type="text"
                                          value={option.value || ''}
                                          onChange={(e) => updateSelectOption(originalIndex, optIndex, { value: e.target.value })}
                                          placeholder="Option value"
                                          className="select-option-value"
                                        />
                                        <input
                                          type="text"
                                          value={option.label || ''}
                                          onChange={(e) => updateSelectOption(originalIndex, optIndex, { label: e.target.value })}
                                          placeholder="Option label"
                                          className="select-option-label"
                                        />
                                        <button
                                          type="button"
                                          className="btn-remove-option"
                                          onClick={() => removeSelectOption(originalIndex, optIndex)}
                                          title="Remove option"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                                {/* Add Custom Option */}
                                <div className="select-option-item select-option-custom">
                                  <div className="select-option-inputs">
                                    <input
                                      type="text"
                                      value="__custom__"
                                      disabled
                                      className="select-option-value"
                                      style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                                    />
                                    <input
                                      type="text"
                                      value="Custom (User can enter value)"
                                      disabled
                                      className="select-option-label"
                                      style={{ backgroundColor: '#f5f5f5', color: '#666', fontStyle: 'italic' }}
                                    />
                                    <button
                                      type="button"
                                      className="btn-add-custom-option"
                                      onClick={() => {
                                        const options = field.options || field.config?.options || [];
                                        const hasCustom = options.some(opt => opt.value === '__custom__');
                                        if (!hasCustom) {
                                          const newOptions = [...options, { value: '__custom__', label: 'Custom' }];
                                          updateFormField(originalIndex, {
                                            options: newOptions,
                                            config: { ...(field.config || {}), options: newOptions }
                                          });
                                        }
                                      }}
                                      title="Add custom option"
                                      disabled={(field.options || field.config?.options || []).some(opt => opt.value === '__custom__')}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                  </div>
                                  <p className="select-option-hint">Allow users to enter a custom value</p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="form-field-footer">
                            <label className="form-field-checkbox-label">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateFormField(originalIndex, { required: e.target.checked })}
                                disabled={field.type === 'custom'}
                                className="form-field-checkbox"
                              />
                              <span>Required Field</span>
                            </label>
                            {field.type === 'custom' && (
                              <span className="form-field-hint">
                                (Custom fields are read-only)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>

              {errors.submit && (
                <div className="form-error">
                  {errors.submit}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingServiceId ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal Overlay */}
      {showUserModal && (
        <div className="modal-overlay" onClick={handleCloseUserModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingUserId ? 'Edit User' : 'Add User'}</h2>
              <button className="modal-close" onClick={handleCloseUserModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <form className="customer-form" onSubmit={handleUserSubmit}>
              <div className="form-grid">
                {/* Name */}
                <div className="form-group">
                  <label htmlFor="user-name">Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="user-name"
                    name="name"
                    value={userFormData.name}
                    onChange={handleUserChange}
                    className={userErrors.name ? 'error' : ''}
                    placeholder="Enter user name"
                  />
                  {userErrors.name && <span className="error-message">{userErrors.name}</span>}
                </div>

                {/* Email */}
                <div className="form-group">
                  <label htmlFor="user-email">Email <span className="required">*</span></label>
                  <input
                    type="email"
                    id="user-email"
                    name="email"
                    value={userFormData.email}
                    onChange={handleUserChange}
                    className={userErrors.email ? 'error' : ''}
                    placeholder="Enter email address"
                  />
                  {userErrors.email && <span className="error-message">{userErrors.email}</span>}
                </div>

                {/* Role */}
                <div className="form-group">
                  <label htmlFor="user-role">Role <span className="required">*</span></label>
                  <select
                    id="user-role"
                    name="role"
                    value={userFormData.role}
                    onChange={handleUserChange}
                    className={userErrors.role ? 'error' : ''}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {userErrors.role && <span className="error-message">{userErrors.role}</span>}
                </div>
              </div>

              {userErrors.submit && (
                <div className="form-error">
                  {userErrors.submit}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseUserModal} disabled={isSubmittingUser}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmittingUser}>
                  {isSubmittingUser ? 'Saving...' : editingUserId ? 'Update User' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
