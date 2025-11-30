import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { hasRole, getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';


const AddCustomers = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPhoneLinked, setIsPhoneLinked] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    address: '',
    locality: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    gender: '',
    dob: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postOffices, setPostOffices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const itemsPerPage = 10;

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers(currentPage);
  }, [currentPage]);

  const fetchCustomers = async (page = 1) => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_ENDPOINTS.CUSTOMERS.BASE}?page=${page}&limit=${itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCustomers(data.data.customers || []);
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
        }
      } else {
        console.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search - reset to page 1 when search changes
  useEffect(() => {
    if (searchQuery && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  // Filter customers based on search query (client-side filtering for now)
  // Note: For better performance with large datasets, move search to backend
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      customer.gender.toLowerCase().includes(query) ||
      (customer.locality && customer.locality.toLowerCase().includes(query))
    );
  });

  const handlePageChange = (page) => {
    setCurrentPage(page);
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
    
    // Only allow numbers for phone and whatsappNumber fields
    let processedValue = value;
    if (name === 'phone' || name === 'whatsappNumber') {
      // Remove all non-numeric characters
      processedValue = value.replace(/\D/g, '');
    }
    
    const updatedData = {
      ...formData,
      [name]: processedValue
    };
    
    // If phone and whatsapp are linked, sync them
    if (isPhoneLinked) {
      if (name === 'phone') {
        updatedData.whatsappNumber = processedValue;
      } else if (name === 'whatsappNumber') {
        updatedData.phone = processedValue;
      }
    }
    
    setFormData(updatedData);
    
    // Auto-fill city, state, country when pincode is entered (for India)
    if (name === 'zipCode' && processedValue.length === 6) {
      fetchPincodeDetails(processedValue);
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const fetchPincodeDetails = async (pincode) => {
    // Only fetch if pincode is 6 digits (Indian pincode format)
    if (!pincode || pincode.length !== 6) {
      setPostOffices([]);
      return;
    }

    try {
      // Using a free Indian pincode API
      // Alternative: You can replace this with your own API or metadata
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();

      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOfficesList = data[0].PostOffice;
        
        // Store all post offices for dropdown
        setPostOffices(postOfficesList);
        
        // Find Sub Post Office by default, otherwise use first one
        const defaultPostOffice = postOfficesList.find(po => po.BranchType === 'Sub Post Office') || postOfficesList[0];
        const firstPostOffice = postOfficesList[0];
        
        setFormData(prev => ({
          ...prev,
          locality: defaultPostOffice ? defaultPostOffice.Name : prev.locality,
          city: firstPostOffice.District || prev.city,
          state: firstPostOffice.State || prev.state,
          country: 'India'
        }));

        // Clear errors for auto-filled fields
        setErrors(prev => ({
          ...prev,
          locality: '',
          city: '',
          state: '',
          country: ''
        }));
      } else {
        setPostOffices([]);
      }
    } catch (error) {
      console.error('Error fetching pincode details:', error);
      setPostOffices([]);
      // Silently fail - don't show error to user, they can manually enter
    }
  };

  const togglePhoneLink = () => {
    const newLinkedState = !isPhoneLinked;
    setIsPhoneLinked(newLinkedState);
    
    // If linking, sync whatsapp with phone
    if (newLinkedState && formData.phone) {
      setFormData(prev => ({
        ...prev,
        whatsappNumber: prev.phone
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields: name, phone, DOB, zipCode
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    
    if (!formData.dob) {
      newErrors.dob = 'Date of Birth is required';
    }
    
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Zip Code is required';
    }
    
    // Optional fields - only validate format if provided
    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = getAuthToken();
      const url = editingCustomerId 
        ? API_ENDPOINTS.CUSTOMERS.BY_ID(editingCustomerId)
        : API_ENDPOINTS.CUSTOMERS.BASE;
      
      const method = editingCustomerId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone,
          whatsappNumber: formData.whatsappNumber || null,
          gender: formData.gender || null,
          dob: formData.dob,
          address: formData.address || null,
          locality: formData.locality || null,
          city: formData.city || null,
          state: formData.state || null,
          zipCode: formData.zipCode,
          country: formData.country || null
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh customers list
        await fetchCustomers();
        
        // Reset form after successful submission
        setFormData({
          name: '',
          email: '',
          phone: '',
          whatsappNumber: '',
          address: '',
          locality: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          gender: '',
          dob: ''
        });
        setIsPhoneLinked(false);
        setEditingCustomerId(null);
        
        // Close modal
        setShowModal(false);
        
        alert(`Customer ${editingCustomerId ? 'updated' : 'added'} successfully!`);
      } else {
        throw new Error(data.message || 'Failed to save customer');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      alert(`Failed to ${editingCustomerId ? 'update' : 'add'} customer: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = async (customer) => {
    try {
      // Fetch full customer details from API
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.CUSTOMERS.BY_ID(customer.id), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.customer) {
          const fullCustomer = data.data.customer;
          
          // Set editing customer ID
          setEditingCustomerId(fullCustomer.id);
          
          // Format DOB for date input (YYYY-MM-DD format)
          // Avoid timezone issues by using local date components
          let formattedDob = '';
          if (fullCustomer.dob) {
            // If dob is a date string, format it for the date input
            const dobDate = new Date(fullCustomer.dob);
            if (!isNaN(dobDate.getTime())) {
              // Use local date components to avoid timezone shift
              const year = dobDate.getFullYear();
              const month = String(dobDate.getMonth() + 1).padStart(2, '0');
              const day = String(dobDate.getDate()).padStart(2, '0');
              formattedDob = `${year}-${month}-${day}`;
            } else if (typeof fullCustomer.dob === 'string' && fullCustomer.dob.match(/^\d{4}-\d{2}-\d{2}/)) {
              // If it's already in YYYY-MM-DD format, use it directly
              formattedDob = fullCustomer.dob.split('T')[0].split(' ')[0];
            }
          }
          
          // Pre-fill form with customer data
          setFormData({
            name: fullCustomer.name || '',
            email: fullCustomer.email || '',
            phone: fullCustomer.phone || '',
            whatsappNumber: fullCustomer.whatsappNumber || fullCustomer.phone || '',
            address: fullCustomer.address || '',
            locality: fullCustomer.locality || '',
            city: fullCustomer.city || '',
            state: fullCustomer.state || '',
            zipCode: fullCustomer.zipCode || '',
            country: fullCustomer.country || '',
            gender: fullCustomer.gender ? fullCustomer.gender.toLowerCase() : '',
            dob: formattedDob
          });
          
          // Check if phone and whatsapp are the same (if whatsapp exists)
          if (fullCustomer.phone && fullCustomer.whatsappNumber && fullCustomer.phone === fullCustomer.whatsappNumber) {
            setIsPhoneLinked(true);
          } else {
            setIsPhoneLinked(false);
          }
          
          // If zipCode exists, fetch post offices for dropdown
          if (fullCustomer.zipCode && fullCustomer.zipCode.length === 6) {
            await fetchPincodeDetails(fullCustomer.zipCode);
          } else {
            setPostOffices([]);
          }
          
          // Open modal
          setShowModal(true);
        }
      } else {
        alert('Failed to load customer details');
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      alert('Failed to load customer details');
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      try {
        const token = getAuthToken();
        const response = await fetch(API_ENDPOINTS.CUSTOMERS.BY_ID(customer.id), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Refresh customers list
          await fetchCustomers();
          alert(`${customer.name} has been deleted`);
        } else {
          throw new Error(data.message || 'Failed to delete customer');
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert(`Failed to delete customer: ${error.message}`);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setErrors({});
    setIsPhoneLinked(false);
    setEditingCustomerId(null);
    setPostOffices([]);
    // Reset form when closing
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsappNumber: '',
      address: '',
      locality: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      gender: '',
      dob: ''
    });
  };

  return (
    <div className="dashboard">
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
        <div className="p-4 md:p-5 bg-gray-100 min-h-[calc(100vh-64px)]">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <span className="hover:text-gray-800 cursor-pointer">Admin</span>
            <span className="text-gray-400">›</span>
            <span className="text-gray-800 font-semibold">Customers</span>
          </div>

          {/* Page Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-5">Customers</h1>

          {/* Search and Add Button Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-5">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
              />
            </div>
            <button 
              className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
              style={{ backgroundColor: '#4A90E2' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#357ABD'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A90E2'}
              onClick={() => {
                setEditingCustomerId(null);
                setShowModal(true);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Add Customer</span>
            </button>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-lg p-4 md:p-5 shadow-sm w-full overflow-visible relative z-10">
            <div className="overflow-x-auto w-full min-w-full block">
              <div className="grid grid-cols-[1.5fr_1.2fr_1fr_1.5fr_1fr_1fr] gap-4 pb-3 border-b-2 border-gray-100 mb-3 min-w-full">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Name</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Phone</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Locality</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Email</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Gender</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Actions</div>
              </div>
              <div className="flex flex-col gap-0 w-full relative z-0">
                {isLoading ? (
                  <div className="py-12 text-center text-gray-500">
                    <p>Loading customers...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <p>No customers found</p>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div 
                      key={customer.id} 
                      className="grid grid-cols-[1.5fr_1.2fr_1fr_1.5fr_1fr_1fr] gap-4 py-4 border-b border-gray-100 transition-colors w-full min-w-full hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/customers/${customer.id}/services`)}
                    >
                      <div className="text-sm text-gray-800 flex items-center" data-label="Name">{customer.name}</div>
                      <div className="text-sm text-gray-800 flex items-center" data-label="Phone">{customer.phone}</div>
                      <div className="text-sm text-gray-800 flex items-center" data-label="Locality">{customer.locality || '-'}</div>
                      <div className="text-sm text-gray-800 flex items-center" data-label="Email">{customer.email}</div>
                      <div className="text-sm text-gray-800 flex items-center" data-label="Gender">{customer.gender}</div>
                      <div className="text-sm flex items-center" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button 
                            className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all p-0" 
                            title="Edit" 
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          {hasRole('admin', 'master_user') && (
                            <button 
                              className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-red-50 hover:border-red-500 hover:text-red-600 transition-all p-0" 
                              title="Delete" 
                              onClick={() => handleDeleteCustomer(customer)}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {!isLoading && pagination.total > 0 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                totalItems={pagination.total}
                itemsPerPage={itemsPerPage}
              />
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
              <h2 className="text-xl font-bold text-gray-800">{editingCustomerId ? 'Edit Customer' : 'Add Customer'}</h2>
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
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-semibold text-gray-800">Name <span className="text-red-500">*</span></label>
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
                  placeholder="Enter customer name"
                />
                {errors.name && <span className="text-xs text-red-600 -mt-1">{errors.name}</span>}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-800">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                    errors.email 
                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                      : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && <span className="text-xs text-red-600 -mt-1">{errors.email}</span>}
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-sm font-semibold text-gray-800">Phone <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 pr-12 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                      errors.phone 
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                    }`}
                    placeholder="Enter phone number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {/* Link Button */}
                  <button
                    type="button"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md transition-all ${
                      isPhoneLinked 
                        ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={togglePhoneLink}
                    title={isPhoneLinked ? 'Unlink phone and WhatsApp' : 'Link phone and WhatsApp'}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      {isPhoneLinked ? (
                        <path d="M5 10L8 13L15 6M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      ) : (
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      )}
                    </svg>
                  </button>
                </div>
                {errors.phone && <span className="text-xs text-red-600 -mt-1">{errors.phone}</span>}
              </div>

              {/* WhatsApp Number */}
              <div className="flex flex-col gap-2">
                <label htmlFor="whatsappNumber" className="text-sm font-semibold text-gray-800">WhatsApp Number</label>
                <input
                  type="tel"
                  id="whatsappNumber"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
                    isPhoneLinked 
                      ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' 
                      : 'bg-white text-gray-800 border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                  }`}
                  placeholder="Enter WhatsApp number"
                  disabled={isPhoneLinked}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-2">
                <label htmlFor="gender" className="text-sm font-semibold text-gray-800">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col gap-2">
                <label htmlFor="dob" className="text-sm font-semibold text-gray-800">Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                    errors.dob 
                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                      : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                  }`}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.dob && <span className="text-xs text-red-600 -mt-1">{errors.dob}</span>}
              </div>

              {/* Address */}
              <div className="flex flex-col gap-2 md:col-span-2">
                <label htmlFor="address" className="text-sm font-semibold text-gray-800">Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                  placeholder="Enter street address"
                />
              </div>

              {/* Zip Code */}
              <div className="flex flex-col gap-2 md:col-span-2">
                <label htmlFor="zipCode" className="text-sm font-semibold text-gray-800">Zip Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                    errors.zipCode 
                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                      : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                  }`}
                  placeholder="Enter zip code"
                />
                {errors.zipCode && <span className="text-xs text-red-600 -mt-1">{errors.zipCode}</span>}
              </div>

              {/* Locality */}
              <div className="flex flex-col gap-2">
                <label htmlFor="locality" className="text-sm font-semibold text-gray-800">Locality</label>
                {postOffices.length > 0 ? (
                  <select
                    id="locality"
                    name="locality"
                    value={formData.locality}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                  >
                    <option value="">Select Post Office</option>
                    {postOffices.map((postOffice, index) => (
                      <option key={index} value={postOffice.Name}>
                        {postOffice.Name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id="locality"
                    name="locality"
                    value={formData.locality}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                    placeholder="Enter locality / Post Office"
                  />
                )}
              </div>

              {/* City */}
              <div className="flex flex-col gap-2">
                <label htmlFor="city" className="text-sm font-semibold text-gray-800">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                  placeholder="Enter city"
                />
              </div>

              {/* State */}
              <div className="flex flex-col gap-2">
                <label htmlFor="state" className="text-sm font-semibold text-gray-800">State</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                  placeholder="Enter state"
                />
              </div>

              {/* Country */}
              <div className="flex flex-col gap-2">
                <label htmlFor="country" className="text-sm font-semibold text-gray-800">Country</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                  placeholder="Enter country"
                />
              </div>
            </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-5 py-2.5 bg-white text-[#4A90E2] border border-[#4A90E2] rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ backgroundColor: isSubmitting ? '#9CA3AF' : '#4A90E2' }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = '#357ABD';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = '#4A90E2';
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? (editingCustomerId ? 'Updating...' : 'Adding...') 
                    : (editingCustomerId ? 'Update Customer' : 'Add Customer')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCustomers;

