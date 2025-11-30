import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { hasRole, getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';


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
        <div className="flex-1 p-4 md:p-5 overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">Settings</h1>
            <p className="text-sm text-gray-600">Manage your application settings</p>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-[#4A90E2] text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === 'users' && (
              <div>
                {/* Section Title */}
                <h2 className="text-xl font-semibold text-gray-800 mb-4">User List</h2>

                {/* Search and Add Button Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                    />
                  </div>
                  {hasRole('admin', 'master_user') && (
                    <button 
                      className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
                      style={{ backgroundColor: '#4A90E2' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#357ABD'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A90E2'}
                      onClick={() => {
                        setEditingUserId(null);
                        setShowUserModal(true);
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Add User</span>
                    </button>
                  )}
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg p-4 md:p-5 shadow-sm w-full overflow-visible relative z-10">
                  <div className="overflow-x-auto w-full min-w-full block">
                    <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 pb-3 border-b-2 border-gray-100 mb-3 min-w-full">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Name</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Email</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Role</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Actions</div>
                    </div>
                    <div className="flex flex-col gap-0 w-full relative z-0">
                      {isLoadingUsers ? (
                        <div className="py-12 text-center text-gray-500">
                          <p>Loading users...</p>
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                          <p>No users found</p>
                        </div>
                      ) : (
                        filteredUsers.map((user) => {
                          const roleColors = {
                            'admin': 'bg-purple-100 text-purple-800',
                            'master_user': 'bg-blue-100 text-blue-800',
                            'user': 'bg-gray-100 text-gray-700',
                          };
                          const roleClass = roleColors[user.role?.toLowerCase()] || roleColors['user'];
                          return (
                            <div key={user.id} className="grid grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 py-4 border-b border-gray-100 transition-colors w-full min-w-full hover:bg-gray-50">
                              <div className="text-sm text-gray-800 flex items-center" data-label="Name">{user.name}</div>
                              <div className="text-sm text-gray-800 flex items-center" data-label="Email">{user.email}</div>
                              <div className="text-sm flex items-center" data-label="Role">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${roleClass}`}>
                                  {user.role || 'user'}
                                </span>
                              </div>
                              <div className="text-sm flex items-center" data-label="Actions">
                                <div className="flex items-center gap-2">
                                  {hasRole('admin', 'master_user') && (
                                    <>
                                      <button 
                                        className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all p-0" 
                                        title="Edit" 
                                        onClick={() => handleEditUser(user)}
                                      >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                          <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      </button>
                                      <button 
                                        className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-red-50 hover:border-red-500 hover:text-red-600 transition-all p-0" 
                                        title="Delete" 
                                        onClick={() => handleDeleteUser(user)}
                                      >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'service' && (
              <div>
                {/* Section Title */}
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Service List</h2>

                {/* Search and Add Button Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                    />
                  </div>
                  {hasRole('admin', 'master_user') && (
                    <button 
                      className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
                      style={{ backgroundColor: '#4A90E2' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#357ABD'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A90E2'}
                      onClick={() => {
                        setEditingServiceId(null);
                        setShowModal(true);
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Add Service</span>
                    </button>
                  )}
                </div>

                {/* Services Table */}
                <div className="bg-white rounded-lg p-4 md:p-5 shadow-sm w-full overflow-visible relative z-10">
                  <div className="overflow-x-auto w-full min-w-full block">
                    <div className="grid grid-cols-[2fr_1fr] gap-4 pb-3 border-b-2 border-gray-100 mb-3 min-w-full">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Service Name</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Actions</div>
                    </div>
                    <div className="flex flex-col gap-0 w-full relative z-0">
                      {isLoading ? (
                        <div className="py-12 text-center text-gray-500">
                          <p>Loading services...</p>
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                          <p>No services found</p>
                        </div>
                      ) : (
                        filteredServices.map((service) => (
                          <div key={service.id} className="grid grid-cols-[2fr_1fr] gap-4 py-4 border-b border-gray-100 transition-colors w-full min-w-full hover:bg-gray-50">
                            <div className="text-sm text-gray-800 flex items-center" data-label="Service Name">{service.name}</div>
                            <div className="text-sm flex items-center" data-label="Actions">
                              <div className="flex items-center gap-2">
                                {hasRole('admin', 'master_user') && (
                                  <>
                                    <button 
                                      className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all p-0" 
                                      title="Edit" 
                                      onClick={() => handleEditService(service)}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                    <button 
                                      className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-red-50 hover:border-red-500 hover:text-red-600 transition-all p-0" 
                                      title="Delete" 
                                      onClick={() => handleDeleteService(service)}
                                    >
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
        <div 
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">{editingServiceId ? 'Edit Service' : 'Add Service'}</h2>
              <button 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                onClick={handleCloseModal}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <form className="flex-1 overflow-y-auto p-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Name */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="name" className="text-sm font-semibold text-gray-800">Service Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                      errors.name 
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="Enter service name"
                  />
                  {errors.name && <span className="text-xs text-red-600 -mt-1">{errors.name}</span>}
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="description" className="text-sm font-semibold text-gray-800">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all resize-none ${
                      errors.description 
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="Enter service description (optional)"
                    rows="4"
                  />
                  {errors.description && <span className="text-xs text-red-600 -mt-1">{errors.description}</span>}
                </div>

                {/* Base Amount */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="baseAmount" className="text-sm font-semibold text-gray-800">Base Amount (₹)</label>
                  <input
                    type="number"
                    id="baseAmount"
                    name="baseAmount"
                    value={formData.baseAmount}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                      errors.baseAmount 
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="Enter base amount (default price)"
                    min="0"
                    step="0.01"
                  />
                  {errors.baseAmount && <span className="text-xs text-red-600 -mt-1">{errors.baseAmount}</span>}
                  <small className="text-xs text-gray-500 mt-1">This will be used as the default unit price when adding this service to invoices</small>
                </div>
              </div>

              {/* Form Builder Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Form Fields</h3>
                  <button 
                    type="button" 
                    className="px-4 py-2 text-[#4A90E2] border border-[#4A90E2] rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:bg-gray-50"
                    onClick={addFormField}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Add Field
                  </button>
                </div>

                {formFields.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm mb-2">No fields added yet. Click "Add Field" to create form fields.</p>
                    <p className="text-xs text-gray-400">Each field will become a column in the service table.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {formFields.slice().reverse().map((field, reversedIndex) => {
                      const originalIndex = formFields.length - 1 - reversedIndex;
                      return (
                      <div key={originalIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-semibold text-gray-700">Field {originalIndex + 1}</span>
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                            onClick={() => removeFormField(originalIndex)}
                            title="Remove field"
                          >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-semibold text-gray-800">Field Name <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={field.name || ''}
                                onChange={(e) => updateFormField(originalIndex, { name: e.target.value })}
                                placeholder="Enter field name (e.g., customer_name)"
                                required
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-semibold text-gray-800">Field Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateFormField(originalIndex, { label: e.target.value })}
                                placeholder="e.g., Customer Name"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-semibold text-gray-800">Field Type <span className="text-red-500">*</span></label>
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
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                              >
                                {fieldTypes.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-semibold text-gray-800">Default Value</label>
                              <input
                                type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'}
                                value={field.defaultValue}
                                onChange={(e) => updateFormField(originalIndex, { defaultValue: e.target.value })}
                                placeholder="Optional default value"
                                disabled={field.type === 'custom'}
                                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
                                  field.type === 'custom' 
                                    ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                                    : 'bg-white text-gray-800 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                                }`}
                              />
                            </div>
                          </div>
                          {field.type === 'custom' && (
                            <div className="flex flex-col gap-2 md:col-span-2 mt-4">
                              <label className="text-sm font-semibold text-gray-800">Formula <span className="text-red-500">*</span></label>
                              <textarea
                                value={field.config?.formula || ''}
                                onChange={(e) => updateFormField(originalIndex, { 
                                  config: { ...(field.config || {}), formula: e.target.value }
                                })}
                                placeholder="e.g., {field1} + {field2} or {field1} * {field2}"
                                rows={3}
                                required
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all font-mono"
                              />
                              <div className="text-xs text-gray-600 space-y-1">
                                <p>
                                  <strong>Available operations:</strong> +, -, *, /, ( )
                                </p>
                                <p>
                                  <strong>Reference fields:</strong> Use {'{'}fieldName{'}'} to reference other fields
                                </p>
                                <p>
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
                            <div className="md:col-span-2 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-sm font-semibold text-gray-800">Dropdown Options</label>
                                <button
                                  type="button"
                                  className="px-3 py-1.5 text-[#4A90E2] border border-[#4A90E2] rounded-lg text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-1.5 hover:bg-gray-50"
                                  onClick={() => addSelectOption(originalIndex)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Add Option
                                </button>
                              </div>
                              <div className="flex flex-col gap-2">
                                {(field.options || field.config?.options || []).length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-500 text-center bg-white rounded border border-gray-200">
                                    <p>No options added. Click "Add Option" to add dropdown values.</p>
                                  </div>
                                ) : (
                                  (field.options || field.config?.options || []).map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={option.value || ''}
                                        onChange={(e) => updateSelectOption(originalIndex, optIndex, { value: e.target.value })}
                                        placeholder="Option value"
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                                      />
                                      <input
                                        type="text"
                                        value={option.label || ''}
                                        onChange={(e) => updateSelectOption(originalIndex, optIndex, { label: e.target.value })}
                                        placeholder="Option label"
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                                      />
                                      <button
                                        type="button"
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                        onClick={() => removeSelectOption(originalIndex, optIndex)}
                                        title="Remove option"
                                      >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      </button>
                                    </div>
                                  ))
                                )}
                                {/* Add Custom Option */}
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                  <input
                                    type="text"
                                    value="__custom__"
                                    disabled
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                                  />
                                  <input
                                    type="text"
                                    value="Custom (User can enter value)"
                                    disabled
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 italic cursor-not-allowed"
                                  />
                                  <button
                                    type="button"
                                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
                                      (field.options || field.config?.options || []).some(opt => opt.value === '__custom__')
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-[#4A90E2] hover:bg-blue-50'
                                    }`}
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
                                <p className="text-xs text-gray-500 mt-1">Allow users to enter a custom value</p>
                              </div>
                            </div>
                          )}
                          <div className="md:col-span-2 mt-4 flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateFormField(originalIndex, { required: e.target.checked })}
                                disabled={field.type === 'custom'}
                                className="w-4 h-4 text-[#4A90E2] border-gray-300 rounded focus:ring-[#4A90E2] disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <span className="text-sm text-gray-800">Required Field</span>
                            </label>
                            {field.type === 'custom' && (
                              <span className="text-xs text-gray-500">
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
                <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {errors.submit}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCloseModal} 
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{ backgroundColor: '#4A90E2' }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#357ABD')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#4A90E2')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingServiceId ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal Overlay */}
      {showUserModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleCloseUserModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">{editingUserId ? 'Edit User' : 'Add User'}</h2>
              <button 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                onClick={handleCloseUserModal}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <form className="flex-1 overflow-y-auto p-6" onSubmit={handleUserSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="user-name" className="text-sm font-semibold text-gray-800">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="user-name"
                    name="name"
                    value={userFormData.name}
                    onChange={handleUserChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                      userErrors.name 
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="Enter user name"
                  />
                  {userErrors.name && <span className="text-xs text-red-600 -mt-1">{userErrors.name}</span>}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="user-email" className="text-sm font-semibold text-gray-800">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    id="user-email"
                    name="email"
                    value={userFormData.email}
                    onChange={handleUserChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                      userErrors.email 
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="Enter email address"
                  />
                  {userErrors.email && <span className="text-xs text-red-600 -mt-1">{userErrors.email}</span>}
                </div>

                {/* Role */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="user-role" className="text-sm font-semibold text-gray-800">Role <span className="text-red-500">*</span></label>
                  <select
                    id="user-role"
                    name="role"
                    value={userFormData.role}
                    onChange={handleUserChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                      userErrors.role 
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {userErrors.role && <span className="text-xs text-red-600 -mt-1">{userErrors.role}</span>}
                </div>
              </div>

              {userErrors.submit && (
                <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {userErrors.submit}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCloseUserModal} 
                  disabled={isSubmittingUser}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{ backgroundColor: '#4A90E2' }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#357ABD')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#4A90E2')}
                  disabled={isSubmittingUser}
                >
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
