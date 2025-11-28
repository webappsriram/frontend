import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { hasRole, getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';
import './AddCustomers.css';

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
      <div className={`dashboard-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="add-customers-content">
          {/* Breadcrumbs */}
          <div className="breadcrumbs">
            <span className="breadcrumb-item">Admin</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-item active">Customers</span>
          </div>

          {/* Page Title */}
          <h1 className="page-title">Customers</h1>

          {/* Search and Add Button Bar */}
          <div className="customers-toolbar">
            <div className="search-box">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="btn-add-customer" onClick={() => {
              setEditingCustomerId(null);
              setShowModal(true);
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Add Customer</span>
            </button>
          </div>

          {/* Customers Table */}
          <div className="customers-table-card">
            <div className="table-container">
              <div className="table-header">
                <div className="table-cell">Name</div>
                <div className="table-cell">Phone</div>
                <div className="table-cell">Locality</div>
                <div className="table-cell">Email</div>
                <div className="table-cell">Gender</div>
                <div className="table-cell">Actions</div>
              </div>
              <div className="table-body">
                {isLoading ? (
                  <div className="table-empty">
                    <p>Loading customers...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="table-empty">
                    <p>No customers found</p>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div 
                      key={customer.id} 
                      className="table-row customer-row-clickable"
                      onClick={() => navigate(`/customers/${customer.id}/services`)}
                    >
                      <div className="table-cell" data-label="Name">{customer.name}</div>
                      <div className="table-cell" data-label="Phone">{customer.phone}</div>
                      <div className="table-cell" data-label="Locality">{customer.locality || '-'}</div>
                      <div className="table-cell" data-label="Email">{customer.email}</div>
                      <div className="table-cell" data-label="Gender">{customer.gender}</div>
                      <div className="table-cell" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons">
                          <button className="action-btn" title="Edit" onClick={() => handleEditCustomer(customer)}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          {hasRole('admin', 'master_user') && (
                            <button className="action-btn action-btn-delete" title="Delete" onClick={() => handleDeleteCustomer(customer)}>
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
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingCustomerId ? 'Edit Customer' : 'Add Customer'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <form className="customer-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Name */}
              <div className="form-group">
                <label htmlFor="name">Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Enter customer name"
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter email address"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              {/* Phone */}
              <div className="form-group phone-whatsapp-column">
                <label htmlFor="phone">Phone <span className="required">*</span></label>
                <div className="phone-input-wrapper">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={errors.phone ? 'error' : ''}
                    placeholder="Enter phone number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {/* Link Button */}
                  <button
                    type="button"
                    className={`link-button ${isPhoneLinked ? 'linked' : ''}`}
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
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>

              {/* WhatsApp Number */}
              <div className="form-group">
                <label htmlFor="whatsappNumber">WhatsApp Number</label>
                <input
                  type="tel"
                  id="whatsappNumber"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  placeholder="Enter WhatsApp number"
                  disabled={isPhoneLinked}
                  className={isPhoneLinked ? 'linked-field' : ''}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              {/* Gender */}
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div className="form-group">
                <label htmlFor="dob">Date of Birth <span className="required">*</span></label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={errors.dob ? 'error' : ''}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.dob && <span className="error-message">{errors.dob}</span>}
              </div>

              {/* Address */}
              <div className="form-group full-width">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter street address"
                />
              </div>

              {/* Zip Code */}
              <div className="form-group full-width">
                <label htmlFor="zipCode">Zip Code <span className="required">*</span></label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className={errors.zipCode ? 'error' : ''}
                  placeholder="Enter zip code"
                />
                {errors.zipCode && <span className="error-message">{errors.zipCode}</span>}
              </div>

              {/* Locality */}
              <div className="form-group">
                <label htmlFor="locality">Locality</label>
                {postOffices.length > 0 ? (
                  <select
                    id="locality"
                    name="locality"
                    value={formData.locality}
                    onChange={handleChange}
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
                    placeholder="Enter locality / Post Office"
                  />
                )}
              </div>

              {/* City */}
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>

              {/* State */}
              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                />
              </div>

              {/* Country */}
              <div className="form-group">
                <label htmlFor="country">Country</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Enter country"
                />
              </div>
            </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
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

