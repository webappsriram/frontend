import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';

const Sales = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', or 'edit'
  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const itemsPerPage = 10;
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Create invoice state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState('draft');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReferenceId, setPaymentReferenceId] = useState('');
  
  // Lead modal state
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadComments, setLeadComments] = useState('');
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isCustomerLead, setIsCustomerLead] = useState(false);
  const [showLeadConfirmDialog, setShowLeadConfirmDialog] = useState(false);
  
  // Service dropdown state
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  
  // Add customer modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    dob: '',
    zipCode: '',
    whatsappNumber: '',
    address: '',
    locality: '',
    city: '',
    state: '',
    country: '',
    gender: ''
  });
  const [customerErrors, setCustomerErrors] = useState({});
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [postOffices, setPostOffices] = useState([]);
  
  // Form validation errors for invoice items
  const [formErrors, setFormErrors] = useState({}); // { itemIndex: { fieldName: 'error message' } }
  // Service field validation errors
  const [serviceErrors, setServiceErrors] = useState({}); // { itemIndex: { serviceId: 'error', quantity: 'error', unitPrice: 'error' } }

  // Fetch invoices from API
  useEffect(() => {
    if (viewMode === 'list') {
      fetchInvoices(currentPage);
    }
  }, [currentPage, searchQuery, viewMode]);

  // Fetch available services
  useEffect(() => {
    if (viewMode === 'create') {
      fetchAvailableServices();
    }
  }, [viewMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showServiceDropdown && !event.target.closest('[data-service-dropdown]')) {
        setShowServiceDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showServiceDropdown]);

  // Search customers
  useEffect(() => {
    if (customerSearch.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        searchCustomers(customerSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch]);

  const fetchInvoices = async (page = 1) => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`${API_ENDPOINTS.SALES.BASE}?page=${page}&limit=${itemsPerPage}${searchParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setInvoices(data.data.invoices || []);
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
        }
      } else {
        console.error('Failed to fetch sales');
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_ENDPOINTS.SERVICES.BASE}?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAvailableServices(data.data.services || []);
        }
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const searchCustomers = async (search) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_ENDPOINTS.SALES.SEARCH_CUSTOMERS}?search=${encodeURIComponent(search)}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCustomerResults(data.data.customers || []);
        }
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomerResults([]);
    }
  };

  const handleAddNewCustomer = () => {
    // Pre-fill name and phone from search intelligently
    const searchQuery = customerSearch.trim();
    const numericOnly = searchQuery.replace(/\D/g, '');
    const hasText = /[a-zA-Z]/.test(searchQuery);
    const hasNumbers = numericOnly.length > 0;
    
    // If search contains " - ", split it (format: "Name - Phone")
    if (searchQuery.includes(' - ')) {
      const searchParts = searchQuery.split(' - ');
      setNewCustomerData(prev => ({
        ...prev,
        name: searchParts[0] || '',
        phone: searchParts[1] ? searchParts[1].replace(/\D/g, '') : ''
      }));
    } else if (hasText && hasNumbers) {
      // Mixed text and numbers - try to separate them
      // Extract numbers for phone
      const phoneNumbers = numericOnly;
      // Extract text for name (remove numbers)
      const nameText = searchQuery.replace(/\d/g, '').trim();
      setNewCustomerData(prev => ({
        ...prev,
        name: nameText || '',
        phone: phoneNumbers || ''
      }));
    } else if (hasText && !hasNumbers) {
      // Only text - populate name
      setNewCustomerData(prev => ({
        ...prev,
        name: searchQuery,
        phone: ''
      }));
    } else if (hasNumbers && !hasText) {
      // Only numbers - populate phone
      setNewCustomerData(prev => ({
        ...prev,
        name: '',
        phone: numericOnly
      }));
    } else {
      // Empty or unknown format - clear both
      setNewCustomerData(prev => ({
        ...prev,
        name: '',
        phone: ''
      }));
    }
    
    setPostOffices([]);
    setShowAddCustomerModal(true);
  };

  const fetchPincodeDetails = async (pincode) => {
    // Only fetch if pincode is 6 digits (Indian pincode format)
    if (!pincode || pincode.length !== 6) {
      setPostOffices([]);
      return;
    }

    try {
      // Using a free Indian pincode API
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();

      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOfficesList = data[0].PostOffice;
        
        // Store all post offices for dropdown
        setPostOffices(postOfficesList);
        
        // Find Sub Post Office by default, otherwise use first one
        const defaultPostOffice = postOfficesList.find(po => po.BranchType === 'Sub Post Office') || postOfficesList[0];
        const firstPostOffice = postOfficesList[0];
        
        setNewCustomerData(prev => ({
          ...prev,
          locality: defaultPostOffice ? defaultPostOffice.Name : prev.locality,
          city: firstPostOffice.District || prev.city,
          state: firstPostOffice.State || prev.state,
          country: 'India'
        }));

        // Clear errors for auto-filled fields
        setCustomerErrors(prev => ({
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

  const validateCustomerForm = () => {
    const newErrors = {};
    
    if (!newCustomerData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!newCustomerData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    if (!newCustomerData.zipCode.trim()) {
      newErrors.zipCode = 'Zip Code is required';
    }

    setCustomerErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateCustomer = async () => {
    if (!validateCustomerForm()) {
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.CUSTOMERS.BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCustomerData.name,
          phone: newCustomerData.phone,
          dob: newCustomerData.dob || null,
          zipCode: newCustomerData.zipCode,
          whatsappNumber: newCustomerData.whatsappNumber || null,
          address: newCustomerData.address || null,
          locality: newCustomerData.locality || null,
          city: newCustomerData.city || null,
          state: newCustomerData.state || null,
          country: newCustomerData.country || null,
          gender: newCustomerData.gender || null
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Select the newly created customer
        const newCustomer = data.data.customer;
        handleSelectCustomer({
          id: newCustomer.id,
          name: newCustomer.name,
          phone: newCustomer.phone
        });
        
        // Close modal and reset form
        setShowAddCustomerModal(false);
        setNewCustomerData({
          name: '',
          phone: '',
          dob: '',
          zipCode: '',
          whatsappNumber: '',
          address: '',
          locality: '',
          city: '',
          state: '',
          country: '',
          gender: ''
        });
        setCustomerErrors({});
        setCustomerSearch(`${newCustomer.name} - ${newCustomer.phone}`);
        
        alert('Customer added successfully!');
      } else {
        throw new Error(data.message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert(`Failed to create customer: ${error.message}`);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.name} - ${customer.phone}`);
    setCustomerResults([]);
    // Check if customer is already a lead
    checkCustomerLeadStatus(customer.id);
  };

  const checkCustomerLeadStatus = async (customerId) => {
    if (!customerId) {
      setIsCustomerLead(false);
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.LEADS.CHECK(customerId), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsCustomerLead(data.data.isLead || false);
        } else {
          setIsCustomerLead(false);
        }
      } else {
        setIsCustomerLead(false);
      }
    } catch (error) {
      console.error('Error checking lead status:', error);
      setIsCustomerLead(false);
    }
  };

  const handleAddService = (service) => {
    if (!service) {
      if (availableServices.length === 0) {
        alert('No services available. Please create services first.');
        return;
      }
      service = availableServices[0];
    }
    
    let formSchema = service.formSchema || service.form_schema;
    // Parse formSchema if it's a string
    if (formSchema && typeof formSchema === 'string') {
      try {
        formSchema = JSON.parse(formSchema);
      } catch (e) {
        console.error('Error parsing formSchema:', e);
        formSchema = null;
      }
    }
    
    const initialFormData = {};
    
    // Initialize form data for dynamic fields
    if (formSchema && formSchema.fields && Array.isArray(formSchema.fields)) {
      formSchema.fields.forEach(field => {
        if (field.type !== 'custom' && field.name) {
          initialFormData[field.name] = field.defaultValue || '';
        }
      });
    }
    
    setInvoiceItems([...invoiceItems, {
      serviceId: service.id,
      serviceName: service.name,
      quantity: 1,
      unitPrice: service.baseAmount || service.base_amount || 0,
      totalPrice: service.baseAmount || service.base_amount || 0,
      formSchema: formSchema, // Store as object, not string
      formData: initialFormData
    }]);
    
    setShowServiceDropdown(false);
  };

  const handleRemoveService = (index) => {
    const updatedItems = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(updatedItems);
    
    // Clear errors for removed item and reindex remaining errors
    const reindexErrors = (errors) => {
      const newErrors = {};
      Object.keys(errors).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex < index) {
          // Keep errors for items before the removed one
          newErrors[keyIndex] = errors[key];
        } else if (keyIndex > index) {
          // Shift errors for items after the removed one
          newErrors[keyIndex - 1] = errors[key];
        }
        // Skip errors for the removed item (keyIndex === index)
      });
      return newErrors;
    };
    
    setFormErrors(prev => reindexErrors(prev));
    setServiceErrors(prev => reindexErrors(prev));
  };

  const handleServiceChange = (index, field, value) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index][field] = value;
    
    // If service changed, update service name, unit price, and form schema
    if (field === 'serviceId') {
      const service = availableServices.find(s => s.id === parseInt(value));
      if (service) {
        updatedItems[index].serviceName = service.name;
        // Set unit price to base amount if available
        if (service.baseAmount || service.base_amount) {
          updatedItems[index].unitPrice = service.baseAmount || service.base_amount;
        }
        // Update form schema and initialize form data
        let formSchema = service.formSchema || service.form_schema;
        // Parse formSchema if it's a string
        if (formSchema && typeof formSchema === 'string') {
          try {
            formSchema = JSON.parse(formSchema);
          } catch (e) {
            console.error('Error parsing formSchema:', e);
            formSchema = null;
          }
        }
        updatedItems[index].formSchema = formSchema;
        const initialFormData = {};
        if (formSchema && formSchema.fields && Array.isArray(formSchema.fields)) {
          formSchema.fields.forEach(f => {
            if (f.type !== 'custom' && f.name) {
              initialFormData[f.name] = f.defaultValue || '';
            }
          });
        }
        updatedItems[index].formData = initialFormData;
      }
    }
    
    // Recalculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = (parseFloat(updatedItems[index].quantity) || 0) * (parseFloat(updatedItems[index].unitPrice) || 0);
    }
    
    setInvoiceItems(updatedItems);
  };

  const handleFormFieldChange = (index, fieldName, value) => {
    const updatedItems = [...invoiceItems];
    if (!updatedItems[index].formData) {
      updatedItems[index].formData = {};
    }
    updatedItems[index].formData[fieldName] = value;
    setInvoiceItems(updatedItems);
  };

  // Format phone number (Indian format: +91 XXXXX XXXXX or 10 digits)
  const formatPhoneNumber = (value) => {
    if (!value) return '';
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Format as Indian phone number (10 digits)
    if (digits.length <= 10) {
      if (digits.length <= 5) {
        return digits;
      } else if (digits.length <= 10) {
        return `${digits.slice(0, 5)} ${digits.slice(5)}`;
      }
    }
    return digits.slice(0, 10).replace(/(\d{5})(\d{5})/, '$1 $2');
  };

  // Format number with proper decimals
  const formatNumber = (value, type) => {
    if (value === '' || value === null || value === undefined) return '';
    // If value is a string with non-numeric characters (except . and -), return as is for validation
    const num = parseFloat(value);
    if (isNaN(num)) return value; // Return original value so we can validate it
    if (type === 'integer') {
      return Math.floor(num).toString();
    }
    return num.toString();
  };

  // Check if a value is a valid number
  const isValidNumber = (value, type) => {
    if (value === '' || value === null || value === undefined) return false;
    const str = String(value).trim();
    if (str === '' || str === '-') return false;
    const num = parseFloat(str);
    if (isNaN(num) || !isFinite(num)) return false;
    // For integer, check if it's a whole number
    if (type === 'integer') {
      return Number.isInteger(num);
    }
    return true;
  };

  // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
  const formatDateForDisplay = (value) => {
    if (!value) return '';
    // If already in YYYY-MM-DD format (from date input), return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    // Try to parse and format
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toISOString().split('T')[0];
  };

  // Parse date from various formats to YYYY-MM-DD
  const parseDateValue = (value) => {
    if (!value) return '';
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    // Try to parse common date formats
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toISOString().split('T')[0];
  };

  const renderDynamicField = (field, fieldIndex, itemIndex) => {
    if (!field || !field.name) {
      return null; // Skip invalid fields
    }
    
    const fieldName = field.name;
    const rawValue = invoiceItems[itemIndex]?.formData?.[fieldName] || '';
    
    if (field.type === 'custom') {
      return null; // Skip custom fields in invoice form
    }
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        const textHasError = formErrors[itemIndex]?.[fieldName];
        // For email, ensure proper formatting
        const displayTextValue = rawValue;
        return (
          <div key={fieldName} className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800">
              {field.label || fieldName} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              value={displayTextValue}
              onChange={(e) => {
                let value = e.target.value;
                // For email, trim and convert to lowercase
                if (field.type === 'email') {
                  value = value.trim().toLowerCase();
                }
                handleFormFieldChange(itemIndex, fieldName, value);
                // Clear error when user starts typing
                if (textHasError) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    if (newErrors[itemIndex]) {
                      const itemErrors = { ...newErrors[itemIndex] };
                      delete itemErrors[fieldName];
                      if (Object.keys(itemErrors).length === 0) {
                        delete newErrors[itemIndex];
                      } else {
                        newErrors[itemIndex] = itemErrors;
                      }
                    }
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                // For email, validate format on blur
                if (field.type === 'email' && e.target.value) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(e.target.value)) {
                    setFormErrors(prev => ({
                      ...prev,
                      [itemIndex]: {
                        ...prev[itemIndex],
                        [fieldName]: 'Please enter a valid email address'
                      }
                    }));
                  }
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                textHasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
              maxLength={field.maxLength || undefined}
            />
            {textHasError && (
              <span className="text-xs text-red-600 -mt-1">{textHasError}</span>
            )}
          </div>
        );
      case 'phone':
        const phoneHasError = formErrors[itemIndex]?.[fieldName];
        // Format phone number for display, but store raw digits
        const displayPhoneValue = formatPhoneNumber(rawValue);
        return (
          <div key={fieldName} className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800">
              {field.label || fieldName} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="tel"
              value={displayPhoneValue}
              onChange={(e) => {
                // Store only digits
                const digitsOnly = e.target.value.replace(/\D/g, '');
                // Limit to 10 digits for Indian phone numbers
                const limitedDigits = digitsOnly.slice(0, 10);
                handleFormFieldChange(itemIndex, fieldName, limitedDigits);
                // Clear error when user starts typing
                if (phoneHasError) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    if (newErrors[itemIndex]) {
                      const itemErrors = { ...newErrors[itemIndex] };
                      delete itemErrors[fieldName];
                      if (Object.keys(itemErrors).length === 0) {
                        delete newErrors[itemIndex];
                      } else {
                        newErrors[itemIndex] = itemErrors;
                      }
                    }
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                phoneHasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || fieldName} (10 digits)`}
              maxLength={12} // 10 digits + 1 space = 12 chars max
            />
            {phoneHasError && (
              <span className="text-xs text-red-600 -mt-1">{phoneHasError}</span>
            )}
          </div>
        );
      case 'date':
        const dateHasError = formErrors[itemIndex]?.[fieldName];
        // Format date value for date input (YYYY-MM-DD)
        const formattedDateValue = parseDateValue(rawValue);
        return (
          <div key={fieldName} className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800">
              {field.label || fieldName} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              value={formattedDateValue}
              onChange={(e) => {
                // Store in YYYY-MM-DD format
                const dateValue = e.target.value;
                handleFormFieldChange(itemIndex, fieldName, dateValue);
                // Clear error when user selects a date
                if (dateHasError) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    if (newErrors[itemIndex]) {
                      const itemErrors = { ...newErrors[itemIndex] };
                      delete itemErrors[fieldName];
                      if (Object.keys(itemErrors).length === 0) {
                        delete newErrors[itemIndex];
                      } else {
                        newErrors[itemIndex] = itemErrors;
                      }
                    }
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                dateHasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
            />
            {dateHasError && (
              <span className="text-xs text-red-600 -mt-1">{dateHasError}</span>
            )}
          </div>
        );
      case 'textarea':
        const textareaHasError = formErrors[itemIndex]?.[fieldName];
        return (
          <div key={fieldName} className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800">
              {field.label || fieldName} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={rawValue}
              onChange={(e) => {
                handleFormFieldChange(itemIndex, fieldName, e.target.value);
                // Clear error when user starts typing
                if (textareaHasError) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    if (newErrors[itemIndex]) {
                      const itemErrors = { ...newErrors[itemIndex] };
                      delete itemErrors[fieldName];
                      if (Object.keys(itemErrors).length === 0) {
                        delete newErrors[itemIndex];
                      } else {
                        newErrors[itemIndex] = itemErrors;
                      }
                    }
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all resize-none ${
                textareaHasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
              rows={field.rows || 3}
            />
            {textareaHasError && (
              <span className="text-xs text-red-600 -mt-1">{textareaHasError}</span>
            )}
          </div>
        );
      case 'number':
      case 'integer':
      case 'decimal':
        const numberHasError = formErrors[itemIndex]?.[fieldName];
        // Use raw value for display to allow validation of invalid input
        const displayValue = rawValue || '';
        return (
          <div key={fieldName} className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800">
              {field.label || fieldName} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={displayValue}
              onChange={(e) => {
                let value = e.target.value;
                
                // Allow only numbers, decimal point, and minus sign
                // For integer, only allow numbers and minus sign
                if (field.type === 'integer') {
                  value = value.replace(/[^\d-]/g, '');
                  // Only allow one minus sign at the start
                  if (value.indexOf('-') > 0) {
                    value = value.replace(/-/g, '');
                  }
                  if (value.startsWith('-')) {
                    value = '-' + value.replace(/-/g, '');
                  }
                } else {
                  // For decimal/number, allow one decimal point
                  value = value.replace(/[^\d.-]/g, '');
                  // Only allow one minus sign at the start
                  if (value.indexOf('-') > 0) {
                    value = value.replace(/-/g, '');
                  }
                  if (value.startsWith('-')) {
                    value = '-' + value.replace(/-/g, '');
                  }
                  // Only allow one decimal point
                  const parts = value.split('.');
                  if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                  }
                }
                
                handleFormFieldChange(itemIndex, fieldName, value);
                
                // Validate immediately
                if (value === '' || value === '-') {
                  if (field.required) {
                    setFormErrors(prev => ({
                      ...prev,
                      [itemIndex]: {
                        ...prev[itemIndex],
                        [fieldName]: `${field.label || fieldName} is required`
                      }
                    }));
                  } else {
                    // Clear error if not required and empty
                    if (numberHasError) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev };
                        if (newErrors[itemIndex]) {
                          const itemErrors = { ...newErrors[itemIndex] };
                          delete itemErrors[fieldName];
                          if (Object.keys(itemErrors).length === 0) {
                            delete newErrors[itemIndex];
                          } else {
                            newErrors[itemIndex] = itemErrors;
                          }
                        }
                        return newErrors;
                      });
                    }
                  }
                } else if (!isValidNumber(value, field.type)) {
                  // Invalid number - show error immediately
                  setFormErrors(prev => ({
                    ...prev,
                    [itemIndex]: {
                      ...prev[itemIndex],
                      [fieldName]: 'Please enter a valid number'
                    }
                  }));
                } else {
                  // Valid number - clear error
                  if (numberHasError) {
                    setFormErrors(prev => {
                      const newErrors = { ...prev };
                      if (newErrors[itemIndex]) {
                        const itemErrors = { ...newErrors[itemIndex] };
                        delete itemErrors[fieldName];
                        if (Object.keys(itemErrors).length === 0) {
                          delete newErrors[itemIndex];
                        } else {
                          newErrors[itemIndex] = itemErrors;
                        }
                      }
                      return newErrors;
                    });
                  }
                }
              }}
              onBlur={(e) => {
                // Format on blur if valid
                const value = e.target.value;
                if (value === '' || value === '-') {
                  if (field.required) {
                    setFormErrors(prev => ({
                      ...prev,
                      [itemIndex]: {
                        ...prev[itemIndex],
                        [fieldName]: `${field.label || fieldName} is required`
                      }
                    }));
                  }
                  return;
                }
                
                if (isValidNumber(value, field.type)) {
                  const num = parseFloat(value);
                  // Format the number
                  if (field.type === 'integer') {
                    handleFormFieldChange(itemIndex, fieldName, Math.floor(num).toString());
                  } else if (field.type === 'decimal') {
                    // Round to 2 decimal places for decimal type
                    const rounded = Math.round(num * 100) / 100;
                    handleFormFieldChange(itemIndex, fieldName, rounded.toString());
                  } else {
                    // For number type, keep as is but ensure it's a valid number
                    handleFormFieldChange(itemIndex, fieldName, num.toString());
                  }
                } else {
                  // Invalid - error should already be set from onChange
                  setFormErrors(prev => ({
                    ...prev,
                    [itemIndex]: {
                      ...prev[itemIndex],
                      [fieldName]: 'Please enter a valid number'
                    }
                  }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                numberHasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
            />
            {numberHasError && (
              <span className="text-xs text-red-600 -mt-1">{numberHasError}</span>
            )}
          </div>
        );
      case 'select':
      case 'dropdown':
        // Get options from field.options or field.config.options
        const options = field.options || field.config?.options || [];
        const hasError = formErrors[itemIndex]?.[fieldName];
        
        return (
          <div key={fieldName} className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800">
              {field.label || fieldName} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={rawValue}
              onChange={(e) => {
                handleFormFieldChange(itemIndex, fieldName, e.target.value);
                // Clear error when user starts typing/selecting
                if (hasError) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    if (newErrors[itemIndex]) {
                      const itemErrors = { ...newErrors[itemIndex] };
                      delete itemErrors[fieldName];
                      if (Object.keys(itemErrors).length === 0) {
                        delete newErrors[itemIndex];
                      } else {
                        newErrors[itemIndex] = itemErrors;
                      }
                    }
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                hasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
            >
              <option value="">Select {field.label || fieldName}</option>
              {options.map((opt, optIndex) => {
                // Handle both string and object options
                const optionValue = typeof opt === 'string' ? opt : (opt.value || opt.label || '');
                const optionLabel = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
                return (
                  <option key={optIndex} value={optionValue}>
                    {optionLabel}
                  </option>
                );
              })}
            </select>
            {hasError && (
              <span className="text-xs text-red-600 -mt-1">{hasError}</span>
            )}
          </div>
        );
      default:
        // Log unhandled field types for debugging
        console.warn(`Unhandled field type: ${field.type} for field: ${fieldName}`);
        return null;
    }
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((sum, item) => {
      return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0));
    }, 0);
  };

  const handleMarkAsLeadClick = () => {
    if (!selectedCustomer) {
      alert('Please select a customer first');
      return;
    }

    // If customer is already a lead, show confirmation dialog
    if (isCustomerLead) {
      setShowLeadConfirmDialog(true);
    } else {
      // If not a lead, open the lead modal directly
      setShowLeadModal(true);
    }
  };

  const handleConfirmAddLeadAgain = () => {
    setShowLeadConfirmDialog(false);
    setShowLeadModal(true);
  };

  const handleMarkAsLead = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer first');
      return;
    }

    try {
      setIsCreatingLead(true);
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.LEADS.BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          comments: leadComments,
          status: 'new'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Customer marked as lead successfully!');
          setShowLeadModal(false);
          setShowLeadConfirmDialog(false);
          setLeadComments('');
          // Update lead status
          setIsCustomerLead(true);
        } else {
          alert(data.message || 'Failed to mark as lead');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to mark as lead');
      }
    } catch (error) {
      console.error('Error marking as lead:', error);
      alert('Failed to mark as lead. Please try again.');
    } finally {
      setIsCreatingLead(false);
    }
  };

  // Validate service fields (serviceId, quantity, unitPrice)
  const validateServiceFields = () => {
    const errors = {};
    let hasErrors = false;

    for (let itemIndex = 0; itemIndex < invoiceItems.length; itemIndex++) {
      const item = invoiceItems[itemIndex];
      const itemErrors = {};

      // Validate service selection - check for empty string, null, undefined, or 0
      if (!item.serviceId || item.serviceId === '' || item.serviceId === '0' || item.serviceId === 0) {
        itemErrors.serviceId = 'Please select a service';
        hasErrors = true;
      }

      // Validate quantity - must be a positive number
      const quantityValue = item.quantity;
      if (quantityValue === '' || quantityValue === null || quantityValue === undefined) {
        itemErrors.quantity = 'Quantity is required';
        hasErrors = true;
      } else {
        const quantityNum = parseFloat(quantityValue);
        if (isNaN(quantityNum)) {
          itemErrors.quantity = 'Please enter a valid number';
          hasErrors = true;
        } else if (quantityNum <= 0) {
          itemErrors.quantity = 'Quantity must be greater than 0';
          hasErrors = true;
        }
      }

      // Validate unit price - must be 0 or greater
      const unitPriceValue = item.unitPrice;
      if (unitPriceValue === '' || unitPriceValue === null || unitPriceValue === undefined) {
        itemErrors.unitPrice = 'Unit price is required';
        hasErrors = true;
      } else {
        const unitPriceNum = parseFloat(unitPriceValue);
        if (isNaN(unitPriceNum)) {
          itemErrors.unitPrice = 'Please enter a valid number';
          hasErrors = true;
        } else if (unitPriceNum < 0) {
          itemErrors.unitPrice = 'Unit price must be 0 or greater';
          hasErrors = true;
        }
      }

      if (Object.keys(itemErrors).length > 0) {
        errors[itemIndex] = itemErrors;
      }
    }

    setServiceErrors(errors);
    return !hasErrors;
  };

  // Validate form fields for all invoice items
  const validateFormFields = () => {
    const errors = {};
    let hasErrors = false;

    for (let itemIndex = 0; itemIndex < invoiceItems.length; itemIndex++) {
      const item = invoiceItems[itemIndex];
      
      // Find the service to get its form schema
      const service = availableServices.find(s => s.id === item.serviceId || s.id === parseInt(item.serviceId));
      if (!service) continue;

      let formSchema = service.formSchema || service.form_schema;
      if (formSchema && typeof formSchema === 'string') {
        try {
          formSchema = JSON.parse(formSchema);
        } catch (e) {
          console.error('Error parsing formSchema:', e);
          formSchema = null;
        }
      }

      if (formSchema && formSchema.fields && Array.isArray(formSchema.fields)) {
        const itemErrors = {};
        
        formSchema.fields.forEach(field => {
          if (field.type === 'custom') return; // Skip custom fields
          
          const fieldName = field.name;
          const fieldValue = item.formData?.[fieldName];
          
          // Validate required fields
          if (field.required) {
            // Check if field is empty
            if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
              itemErrors[fieldName] = `${field.label || fieldName} is required`;
              hasErrors = true;
            }
          }
          
          // Validate field format for both required and optional fields (if they have values)
          if (fieldValue && (typeof fieldValue === 'string' && fieldValue.trim() !== '')) {
            if (field.type === 'email') {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(fieldValue.trim())) {
                itemErrors[fieldName] = 'Please enter a valid email address';
                hasErrors = true;
              }
            } else if (field.type === 'number' || field.type === 'integer' || field.type === 'decimal') {
              const trimmedValue = String(fieldValue).trim();
              // Check if it's a valid number (not empty, not just dashes, and can be parsed)
              if (trimmedValue === '' || trimmedValue === '-' || isNaN(parseFloat(trimmedValue))) {
                itemErrors[fieldName] = 'Please enter a valid number';
                hasErrors = true;
              } else {
                // Additional check: ensure it's actually a number, not text
                const num = parseFloat(trimmedValue);
                if (isNaN(num) || !isFinite(num)) {
                  itemErrors[fieldName] = 'Please enter a valid number';
                  hasErrors = true;
                }
              }
            }
          }
        });
        
        if (Object.keys(itemErrors).length > 0) {
          errors[itemIndex] = itemErrors;
        }
      }
    }

    setFormErrors(errors);
    return !hasErrors;
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (invoiceItems.length === 0) {
      alert('Please add at least one service to the sale');
      return;
    }

    // Validate service fields (serviceId, quantity, unitPrice)
    if (!validateServiceFields()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('.invoice-select.error, .invoice-input.error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      alert('Please fill in all service fields correctly');
      return;
    }

    // Validate dynamic form fields
    if (!validateFormFields()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('input.error, select.error, textarea.error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      alert('Please fill in all required fields correctly');
      return;
    }

    try {
      setIsCreating(true);
      const token = getAuthToken();
      const url = editingInvoiceId 
        ? API_ENDPOINTS.SALES.BY_ID(editingInvoiceId)
        : API_ENDPOINTS.SALES.BASE;
      const method = editingInvoiceId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          items: invoiceItems.map(item => ({
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            formData: item.formData && Object.keys(item.formData).length > 0 ? item.formData : null
          })),
          status: invoiceStatus,
          paymentMethod: invoiceStatus === 'paid' ? paymentMethod : null,
          paymentReferenceId: invoiceStatus === 'paid' && (paymentMethod === 'Bank Transfer' || paymentMethod === 'UPI') ? paymentReferenceId : null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(editingInvoiceId ? 'Sale updated successfully!' : 'Sale created successfully!');
          // Reset form
          setSelectedCustomer(null);
          setCustomerSearch('');
          setInvoiceItems([]);
          setInvoiceStatus('draft');
          setPaymentMethod('');
          setPaymentReferenceId('');
          setEditingInvoiceId(null);
          setViewMode('list');
          setFormErrors({}); // Clear form errors
          setServiceErrors({}); // Clear service errors
          setIsCustomerLead(false); // Reset lead status
          fetchInvoices(1);
        } else {
          alert(data.message || `Failed to ${editingInvoiceId ? 'update' : 'create'} sale`);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || `Failed to ${editingInvoiceId ? 'update' : 'create'} sale`);
      }
    } catch (error) {
      console.error(`Error ${editingInvoiceId ? 'updating' : 'creating'} sale:`, error);
      alert(`Failed to ${editingInvoiceId ? 'update' : 'create'} sale. Please try again.`);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditInvoice = async (invoiceId) => {
    try {
      // First fetch available services
      await fetchAvailableServices();
      
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.SALES.BY_ID(invoiceId), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.invoice) {
          const invoice = data.data.invoice;
          
          // Set customer
          const customer = {
            id: invoice.customerId,
            name: invoice.customer.name,
            phone: invoice.customer.phone
          };
          setSelectedCustomer(customer);
          setCustomerSearch(`${invoice.customer.name} - ${invoice.customer.phone}`);
          // Check if customer is already a lead
          checkCustomerLeadStatus(customer.id);
          
          // Set invoice items - wait a bit for availableServices to be populated
          setTimeout(() => {
            const items = invoice.items.map(item => {
              // Get service form schema if available
              const service = availableServices.find(s => s.id === item.serviceId);
              const formSchema = service?.formSchema || service?.form_schema;
              
              return {
                serviceId: item.serviceId,
                serviceName: item.serviceName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                formSchema: formSchema,
                formData: item.formData || {}
              };
            });
            setInvoiceItems(items);
          }, 100);
          
          // Set status
          setInvoiceStatus(invoice.status || 'draft');
          
          // Set payment method if status is paid
          if (invoice.status === 'paid') {
            setPaymentMethod(invoice.paymentMethod || '');
            setPaymentReferenceId(invoice.paymentReferenceId || '');
          } else {
            setPaymentMethod('');
            setPaymentReferenceId('');
          }
          
          // Set editing mode
          setEditingInvoiceId(invoiceId);
          setViewMode('create');
        } else {
          alert('Failed to load sale details');
        }
      } else {
        alert('Failed to load invoice details');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Failed to load invoice details');
    }
  };

  const handleViewInvoice = async (invoiceId) => {
    if (!invoiceId) {
      alert('Invalid invoice ID');
      return;
    }
    
    try {
      // Show modal immediately
      setShowInvoiceModal(true);
      setViewingInvoice(null);
      document.body.style.overflow = 'hidden';
      
      const token = getAuthToken();
      if (!token) {
        alert('Please login to view invoices');
        setShowInvoiceModal(false);
        document.body.style.overflow = '';
        return;
      }

      const response = await fetch(API_ENDPOINTS.SALES.BY_ID(invoiceId), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const invoice = data.data?.invoice;
        
        if (invoice && invoice.id) {
          // Ensure items is an array
          if (!invoice.items || !Array.isArray(invoice.items)) {
            invoice.items = [];
          }
          // Ensure customer exists
          if (!invoice.customer) {
            invoice.customer = {};
          }
          setViewingInvoice(invoice);
        } else {
          alert('Failed to load invoice: Invoice data not found or invalid.');
          setShowInvoiceModal(false);
          document.body.style.overflow = '';
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert('Failed to load invoice: ' + (errorData.message || 'Server error'));
        setShowInvoiceModal(false);
        document.body.style.overflow = '';
      }
    } catch (error) {
      alert('Failed to load invoice: ' + (error.message || 'Network error'));
      setShowInvoiceModal(false);
      document.body.style.overflow = '';
    }
  };

  const closeViewModal = () => {
    setShowInvoiceModal(false);
    setViewingInvoice(null);
    document.body.style.overflow = '';
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please login to download sales');
        return;
      }

      const response = await fetch(API_ENDPOINTS.SALES.BY_ID(invoiceId), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.invoice) {
          // Validate invoice data before generating PDF
          if (!data.data.invoice.items || data.data.invoice.items.length === 0) {
            alert('Sale has no items. Cannot generate PDF.');
            return;
          }
          generateInvoicePDF(data.data.invoice);
        } else {
          alert('Failed to load sale details: ' + (data.message || 'Unknown error'));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert('Failed to load sale details: ' + (errorData.message || 'Server error'));
      }
    } catch (error) {
      console.error('Error loading sale:', error);
      alert('Failed to load sale details: ' + error.message);
    }
  };

  const generateInvoicePDF = (invoice) => {
    try {
      console.log('Generating PDF for invoice:', invoice);
      
      // Create a temporary div to render the invoice
      const invoiceHTML = generateInvoiceHTML(invoice);
      const styles = getInvoiceStyles();
      
      // Try using iframe approach first (more reliable, less likely to be blocked)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invoice ${invoice.invoiceNumber || `INV-${invoice.id}`}</title>
            <style>
              ${styles}
            </style>
          </head>
          <body>
            ${invoiceHTML}
          </body>
        </html>
      `);
      iframeDoc.close();
      
      // Wait for iframe to load, then print
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            // Remove iframe after a delay
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          } catch (printError) {
            console.error('Print error:', printError);
            // Fallback to window.open method
            tryWindowOpenMethod(invoice, invoiceHTML, styles);
            document.body.removeChild(iframe);
          }
        }, 500);
      };
      
      // Fallback: if onload doesn't fire
      setTimeout(() => {
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          } catch (printError) {
            console.error('Print error (fallback):', printError);
            tryWindowOpenMethod(invoice, invoiceHTML, styles);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate sale PDF. Please try again.');
    }
  };

  const tryWindowOpenMethod = (invoice, invoiceHTML, styles) => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        alert('Unable to open print dialog. Please allow popups for this site or use your browser\'s print function on the invoice view.');
        return;
      }
      
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invoice ${invoice.invoiceNumber || `INV-${invoice.id}`}</title>
            <style>
              ${styles}
            </style>
          </head>
          <body>
            ${invoiceHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    } catch (error) {
      console.error('Window.open method also failed:', error);
      alert('Failed to open print dialog. Please try viewing the invoice and using your browser\'s print function.');
    }
  };

  const generateInvoiceHTML = (invoice) => {
    const invoiceDate = invoice.createdOn 
      ? new Date(invoice.createdOn).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });

    // Calculate subtotal
    const subtotal = invoice.items.reduce((sum, item) => {
      return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0));
    }, 0);
    
    // Calculate tax (assuming 0% for now, can be added later)
    const salesTax = 0;
    const pnp = 0; // Postage & Packaging
    const totalDue = parseFloat(invoice.totalAmount) || subtotal;

    let itemsHTML = '';
    invoice.items.forEach((item, index) => {
      const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
      const description = item.serviceName;
      
      itemsHTML += `
        <tr>
          <td>${item.quantity || ''}</td>
          <td>${description}</td>
          <td style="text-align: right;">₹${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
          <td style="text-align: right;">₹${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    // Get customer address parts
    const customerAddress = invoice.customer?.address || '';
    const customerCity = invoice.customer?.city || '';
    const customerState = invoice.customer?.state || '';
    const customerZip = invoice.customer?.zipCode || '';
    const customerLocation = `${customerCity}${customerCity && customerState ? ', ' : ''}${customerState} ${customerZip}`.trim();

    return `
      <div class="invoice-container">
        <div class="invoice-header">
          <div class="invoice-company">
            <h1>SriRam E-sevaiMiyam</h1>
            <p>[Street Address]</p>
            <p>[Town, County Postal Code]</p>
            <p>Phone [01234 567890] Fax [01234 567890]</p>
          </div>
          <div class="invoice-title-section">
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-meta">
              <div class="invoice-meta-row">
                <span class="invoice-meta-label">INVOICE No</span>
                <span class="invoice-meta-value">${invoice.invoiceNumber || `INV-${invoice.id}`}</span>
              </div>
              <div class="invoice-meta-row">
                <span class="invoice-meta-label">DATE:</span>
                <span class="invoice-meta-value">${invoiceDate}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="invoice-addresses">
          <div class="invoice-address-section">
            <div class="address-label">Billing Address:</div>
            <div class="address-content">
              <p>${invoice.customer?.name || 'Name'}</p>
              <p>${invoice.customer?.company || 'Company'}</p>
              <p>${customerAddress || 'Address'}</p>
              <p>${customerLocation || 'Town, County Postal Code'}</p>
              <p>${invoice.customer?.phone || 'Phone'}</p>
            </div>
          </div>
          <div class="invoice-address-section">
            <div class="address-label">Delivery Address:</div>
            <div class="address-content">
              <p>${invoice.customer?.name || 'Name'}</p>
              <p>${invoice.customer?.company || 'Company'}</p>
              <p>${customerAddress || 'Address'}</p>
              <p>${customerLocation || 'Town, County Postal Code'}</p>
              <p>${invoice.customer?.phone || 'Phone'}</p>
            </div>
          </div>
        </div>
        
        <div class="invoice-instructions">
          <p>Comments or special instructions:</p>
        </div>
        
        <table class="invoice-info-table">
          <tbody>
            <tr>
              <td class="info-label">SALESPERSON</td>
              <td class="info-label">P.O. NUMBER</td>
              <td class="info-label">SENT DATE</td>
              <td class="info-label">SENT VIA</td>
              <td class="info-label">F.O.B. POINT</td>
              <td class="info-label">TERMS</td>
            </tr>
            <tr>
              <td class="info-value"></td>
              <td class="info-value"></td>
              <td class="info-value"></td>
              <td class="info-value"></td>
              <td class="info-value"></td>
              <td class="info-value">Due on receipt</td>
            </tr>
          </tbody>
        </table>
        
        <table class="invoice-items">
          <thead>
            <tr>
              <th>QUANTITY</th>
              <th>DESCRIPTION</th>
              <th style="text-align: right;">UNIT PRICE</th>
              <th style="text-align: right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div class="invoice-summary">
          <div class="summary-row">
            <div class="summary-label">SUBTOTAL</div>
            <div class="summary-value">₹${subtotal.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div class="summary-label">SALES TAX</div>
            <div class="summary-value">₹${salesTax.toFixed(2)}</div>
        </div>
          <div class="summary-row">
            <div class="summary-label">P&P</div>
            <div class="summary-value">₹${pnp.toFixed(2)}</div>
        </div>
          <div class="summary-row total-row">
            <div class="summary-label">TOTAL DUE</div>
            <div class="summary-value">₹${totalDue.toFixed(2)}</div>
          </div>
        </div>
        
        <div class="invoice-footer">
          <p>Make all cheques payable to SriRam E-sevaiMiyam</p>
          <p>If you have any questions concerning this invoice, contact [Name, Phone Number, E-mail]</p>
          <p class="footer-thanks">THANK YOU FOR YOUR BUSINESS!</p>
        </div>
      </div>
    `;
  };

  const getInvoiceStyles = () => {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        color: #000;
        background: white;
        line-height: 1.4;
        padding: 20px;
      }
      
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
      }
      
      .invoice-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 25px;
      }
      
      .invoice-company {
        flex: 1;
      }
      
      .invoice-company h1 {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 4px;
        color: #000;
      }
      
      .company-slogan {
        font-size: 11px;
        color: #666;
        margin-bottom: 8px;
      }
      
      .invoice-company p {
        font-size: 11px;
        color: #000;
        margin: 2px 0;
      }
      
      .invoice-title-section {
        text-align: right;
        flex: 1;
      }
      
      .invoice-title {
        font-size: 42px;
        font-weight: bold;
        color: #000;
        margin-bottom: 8px;
        letter-spacing: 2px;
      }
      
      .invoice-meta {
        margin-top: 8px;
      }
      
      .invoice-meta-row {
        margin-bottom: 4px;
        font-size: 11px;
      }
      
      .invoice-meta-label {
        font-weight: normal;
        margin-right: 8px;
      }
      
      .invoice-meta-value {
        font-weight: normal;
      }
      
      .invoice-addresses {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        gap: 30px;
      }
      
      .invoice-address-section {
        flex: 1;
      }
      
      .address-label {
        font-weight: bold;
        font-size: 11px;
        margin-bottom: 6px;
        color: #000;
      }
      
      .address-content {
        font-size: 11px;
        color: #000;
      }
      
      .address-content p {
        margin: 2px 0;
      }
      
      .invoice-instructions {
        margin-bottom: 15px;
        font-size: 11px;
        color: #000;
      }
      
      .invoice-info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 10px;
      }
      
      .invoice-info-table tr:first-child {
        border-bottom: 1px solid #ddd;
      }
      
      .invoice-info-table td {
        padding: 6px 4px;
        text-align: left;
      }
      
      .info-label {
        font-weight: bold;
        font-size: 9px;
        color: #000;
      }
      
      .info-value {
        font-size: 10px;
        color: #000;
      }
      
      .invoice-items {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        border: 1px solid #000;
      }
      
      .invoice-items thead {
        background: #f0f0f0;
      }
      
      .invoice-items th {
        padding: 8px 6px;
        text-align: left;
        font-weight: bold;
        font-size: 10px;
        border: 1px solid #000;
        border-bottom: 2px solid #000;
      }
      
      .invoice-items th:last-child,
      .invoice-items th:nth-child(3),
      .invoice-items th:nth-child(4) {
        text-align: right;
      }
      
      .invoice-items td {
        padding: 6px;
        border: 1px solid #ddd;
        font-size: 11px;
        border-right: 1px solid #000;
      }
      
      .invoice-items tbody tr:last-child td {
        border-bottom: 1px solid #000;
      }
      
      .invoice-items td:last-child,
      .invoice-items td:nth-child(3),
      .invoice-items td:nth-child(4) {
        text-align: right;
      }
      
      .invoice-summary {
        width: 100%;
        max-width: 300px;
        margin-left: auto;
        margin-bottom: 30px;
      }
      
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 8px;
        font-size: 11px;
        border-bottom: 1px solid #ddd;
      }
      
      .summary-row.total-row {
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        font-weight: bold;
        font-size: 12px;
        padding: 8px;
        margin-top: 4px;
      }
      
      .summary-label {
        font-weight: bold;
        color: #000;
      }
      
      .summary-value {
        color: #000;
        text-align: right;
      }
      
      .invoice-footer {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        font-size: 10px;
        color: #000;
      }
      
      .invoice-footer p {
        margin: 4px 0;
      }
      
      .footer-thanks {
        font-weight: bold;
        font-size: 11px;
        margin-top: 10px;
        letter-spacing: 1px;
      }
      
      @media print {
        body {
          padding: 10px;
        }
        
        .invoice-container {
          max-width: 100%;
        }
        
        @page {
          margin: 0.5cm;
        }
        
        .invoice-container {
          max-width: 100%;
        }
      }
    `;
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
        <div className="p-4 md:p-5 bg-gray-100 min-h-[calc(100vh-64px)]">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center mb-5">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sales</h1>
              {viewMode === 'list' && (
                <button 
                  className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ backgroundColor: '#4A90E2' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#357ABD'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A90E2'}
                  onClick={() => setViewMode('create')}
                >
                  + Create Sale
                </button>
              )}
              {viewMode === 'create' && (
                <button 
                  className="px-5 py-2.5 bg-white text-[#4A90E2] border border-[#4A90E2] rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50"
                  onClick={() => {
                    setViewMode('list');
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                    setInvoiceItems([]);
                    setInvoiceStatus('draft');
                    setIsCustomerLead(false); // Reset lead status
                    setPaymentMethod('');
                    setPaymentReferenceId('');
                    setEditingInvoiceId(null);
                  }}
                >
                  ← Back to List
                </button>
              )}
            </div>

            {viewMode === 'list' ? (
              <>
                {/* Search Bar */}
                <div className="mb-5">
                  <div className="relative flex items-center">
                    <svg className="absolute left-3 text-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by sale number, customer name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                    />
                  </div>
                </div>

                {/* Invoices Table */}
                <div className="bg-white rounded-lg p-4 md:p-5 shadow-sm w-full overflow-visible relative z-10">
                  <div className="overflow-x-auto w-full min-w-full block">
                    <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.2fr] gap-4 pb-3 border-b-2 border-gray-100 mb-3 min-w-full">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Invoice Number</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Customer</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Date</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Amount</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Status</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Actions</div>
                    </div>
                    <div className="flex flex-col gap-0 w-full relative z-0">
                      {isLoading ? (
                        <div className="py-12 text-center text-gray-500">
                          <p>Loading sales...</p>
                        </div>
                      ) : invoices.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                          <p>No sales found</p>
                        </div>
                      ) : (
                        invoices.map((invoice) => {
                          const statusColors = {
                            'draft': 'bg-gray-100 text-gray-700',
                            'pending': 'bg-yellow-100 text-yellow-800',
                            'paid': 'bg-green-100 text-green-800',
                            'overdue': 'bg-red-100 text-red-800',
                            'cancelled': 'bg-gray-100 text-gray-600',
                          };
                          const statusClass = statusColors[invoice.status?.toLowerCase()] || statusColors['pending'];
                          return (
                            <div key={invoice.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.2fr] gap-4 py-4 border-b border-gray-100 transition-colors w-full min-w-full hover:bg-gray-50">
                              <div className="text-sm text-gray-800 flex items-center" data-label="Invoice Number">
                                {invoice.invoiceNumber || `INV-${invoice.id}`}
                              </div>
                              <div className="text-sm text-gray-800 flex items-center" data-label="Customer">
                                {invoice.customerName || '-'}
                              </div>
                              <div className="text-sm text-gray-800 flex items-center" data-label="Date">
                                {invoice.createdOn 
                                  ? new Date(invoice.createdOn).toLocaleDateString('en-IN', { 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric' 
                                    })
                                  : '-'}
                              </div>
                              <div className="text-sm text-gray-800 flex items-center" data-label="Amount">
                                {invoice.totalAmount ? `₹${parseFloat(invoice.totalAmount).toLocaleString('en-IN')}` : '-'}
                              </div>
                              <div className="text-sm flex items-center" data-label="Status">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusClass}`}>
                                  {invoice.status || 'Pending'}
                                </span>
                              </div>
                              <div className="text-sm flex items-center" data-label="Actions">
                                <div className="flex items-center gap-2">
                                  <button 
                                    className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all p-0" 
                                    title="View"
                                    onClick={() => handleViewInvoice(invoice.id)}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <path d="M8 2C4.5 2 1.73 4.11 1 7C1.73 9.89 4.5 12 8 12C11.5 12 14.27 9.89 15 7C14.27 4.11 11.5 2 8 2ZM8 10.5C6.07 10.5 4.5 8.93 4.5 7C4.5 5.07 6.07 3.5 8 3.5C9.93 3.5 11.5 5.07 11.5 7C11.5 8.93 9.93 10.5 8 10.5ZM8 5C7.17 5 6.5 5.67 6.5 6.5C6.5 7.33 7.17 8 8 8C8.83 8 9.5 7.33 9.5 6.5C9.5 5.67 8.83 5 8 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                  <button 
                                    className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all p-0" 
                                    title="Edit"
                                    onClick={() => handleEditInvoice(invoice.id)}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                  <button 
                                    className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all p-0" 
                                    title="Download"
                                    onClick={() => handleDownloadInvoice(invoice.id)}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <path d="M8 11L8 3M8 11L5 8M8 11L11 8M3 13L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
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
              </>
            ) : (
              <div className="bg-white rounded-lg p-5 md:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">{editingInvoiceId ? 'Edit Sale' : 'Create New Sale'}</h2>
                  {selectedCustomer && (
                    <div className="relative" data-service-dropdown>
                      <button 
                        className="px-4 py-2 text-[#4A90E2] border border-[#4A90E2] rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:bg-gray-50 whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowServiceDropdown(!showServiceDropdown);
                          if (!showServiceDropdown) {
                            setServiceSearchQuery('');
                          }
                        }}
                      >
                        + Add Service
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: showServiceDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {showServiceDropdown && (
                        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] max-h-80 overflow-hidden flex flex-col">
                          <div className="relative p-3 border-b border-gray-200">
                            <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 14L10.2 10.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <input
                              type="text"
                              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2]/10"
                              placeholder="Search services..."
                              value={serviceSearchQuery}
                              onChange={(e) => setServiceSearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="overflow-y-auto max-h-64">
                            {availableServices
                              .filter(service => 
                                service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                              )
                              .map((service) => (
                                <div
                                  key={service.id}
                                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddService(service);
                                  }}
                                >
                                  {service.name}
                                </div>
                              ))}
                            {availableServices.filter(service => 
                              service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                No services found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Customer Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Select Customer *</label>
                  <div className="relative max-w-md">
                    {!selectedCustomer ? (
                      <input
                        type="text"
                        placeholder="Search by customer name or phone..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          if (!e.target.value) {
                            setSelectedCustomer(null);
                            setIsCustomerLead(false); // Reset lead status
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                      />
                    ) : (
                      <div className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-800">
                        {selectedCustomer.name} - {selectedCustomer.phone}
                      </div>
                    )}
                    {customerResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] max-h-60 overflow-y-auto">
                        {customerResults.map((customer) => (
                          <div
                            key={customer.id}
                            className="px-4 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="text-sm font-semibold text-gray-800">{customer.name}</div>
                            <div className="text-xs text-gray-600">{customer.phone}</div>
                            {customer.city && (
                              <div className="text-xs text-gray-500 mt-1">{customer.city}, {customer.state}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {customerSearch.trim().length > 0 && customerResults.length === 0 && !selectedCustomer && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] p-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-3">
                            No customer found matching "{customerSearch}"
                          </div>
                          <button
                            className="px-4 py-2 text-[#4A90E2] border border-[#4A90E2] rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:bg-gray-50"
                            onClick={handleAddNewCustomer}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M8 4V12M4 8H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Add New Customer
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedCustomer && (
                      <div className="mt-3 max-w-md p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-800 mb-1">{selectedCustomer.name}</div>
                            <div className="text-xs text-gray-600">{selectedCustomer.phone}</div>
                            {selectedCustomer.city && (
                              <div className="text-xs text-gray-500 mt-1">{selectedCustomer.city}, {selectedCustomer.state}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              className={`px-3 py-1.5 text-xs rounded-md font-medium cursor-pointer transition-all ${
                                isCustomerLead
                                  ? 'text-green-700 bg-green-50 border border-green-300 hover:bg-green-100'
                                  : 'text-orange-600 border border-orange-200 hover:bg-orange-50'
                              }`}
                              onClick={handleMarkAsLeadClick}
                              title={isCustomerLead ? 'Already a Lead - Click to add again' : 'Mark as Lead'}
                            >
                              {isCustomerLead ? 'Already a Lead' : 'Mark as Lead'}
                            </button>
                            <button
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all text-xl font-bold leading-none"
                              onClick={() => {
                                setSelectedCustomer(null);
                                setCustomerSearch('');
                                setIsCustomerLead(false); // Reset lead status
                              }}
                              title="Remove customer"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Services Section */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-800 mb-4">Services *</label>
                  
                  {invoiceItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm">No services added. Click "Add Service" to add services to this invoice.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr] gap-4 pb-3 border-b-2 border-gray-100 mb-3 min-w-full">
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Service</div>
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quantity</div>
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit Price (₹)</div>
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total (₹)</div>
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</div>
                      </div>
                      {invoiceItems.map((item, index) => {
                        // Get formSchema from item first, then fallback to availableServices
                        let formSchema = item.formSchema;
                        if (!formSchema) {
                          const service = availableServices.find(s => s.id === item.serviceId || s.id === parseInt(item.serviceId));
                          formSchema = service?.formSchema || service?.form_schema;
                        }
                        // Ensure formSchema is properly structured
                        if (formSchema && typeof formSchema === 'string') {
                          try {
                            formSchema = JSON.parse(formSchema);
                          } catch (e) {
                            console.error('Error parsing formSchema:', e);
                            formSchema = null;
                          }
                        }
                        
                        // Ensure formSchema is an object with fields array
                        if (formSchema && !formSchema.fields) {
                          formSchema = null;
                        }
                        
                        // Get fields array, filtering out custom fields and invalid fields
                        const formFields = formSchema && Array.isArray(formSchema.fields) 
                          ? formSchema.fields.filter(field => {
                              return field && field.name && field.type !== 'custom';
                            })
                          : [];
                        
                        // Debug: Log formFields to help identify issues
                        if (formSchema && formSchema.fields) {
                          console.log(`Service ${item.serviceName} - formSchema fields:`, {
                            totalFields: formSchema.fields.length,
                            filteredFields: formFields.length,
                            allFields: formSchema.fields.map(f => ({ name: f.name, type: f.type })),
                            filteredFieldsList: formFields.map(f => ({ name: f.name, type: f.type }))
                          });
                        }
                        
                        const hasFormFields = formFields.length > 0;
                        
                        return (
                          <div key={index} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0">
                            <div className="mb-3">
                              <span className="text-sm font-semibold text-gray-800">{item.serviceName || 'Select Service'}</span>
                            </div>
                            <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr] gap-4">
                              <div className="flex flex-col">
                                <select
                                  value={item.serviceId}
                                  onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    handleServiceChange(index, 'serviceId', selectedValue);
                                    // Clear error when user selects a service (not empty)
                                    if (selectedValue && selectedValue !== '' && serviceErrors[index]?.serviceId) {
                                      setServiceErrors(prev => {
                                        const newErrors = { ...prev };
                                        if (newErrors[index]) {
                                          const itemErrors = { ...newErrors[index] };
                                          delete itemErrors.serviceId;
                                          if (Object.keys(itemErrors).length === 0) {
                                            delete newErrors[index];
                                          } else {
                                            newErrors[index] = itemErrors;
                                          }
                                        }
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  onBlur={() => {
                                    // Validate on blur
                                    if (!item.serviceId || item.serviceId === '' || item.serviceId === '0') {
                                      setServiceErrors(prev => ({
                                        ...prev,
                                        [index]: {
                                          ...prev[index],
                                          serviceId: 'Please select a service'
                                        }
                                      }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                                    serviceErrors[index]?.serviceId 
                                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                                      : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                                  }`}
                                >
                                  <option value="">Select Service</option>
                                  {availableServices.map((service) => (
                                    <option key={service.id} value={service.id}>
                                      {service.name}
                                    </option>
                                  ))}
                                </select>
                                {serviceErrors[index]?.serviceId && (
                                  <span className="text-xs text-red-600 mt-1">{serviceErrors[index].serviceId}</span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    handleServiceChange(index, 'quantity', value);
                                    // Clear error when user enters valid value
                                    if (value && value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
                                      if (serviceErrors[index]?.quantity) {
                                        setServiceErrors(prev => {
                                          const newErrors = { ...prev };
                                          if (newErrors[index]) {
                                            const itemErrors = { ...newErrors[index] };
                                            delete itemErrors.quantity;
                                            if (Object.keys(itemErrors).length === 0) {
                                              delete newErrors[index];
                                            } else {
                                              newErrors[index] = itemErrors;
                                            }
                                          }
                                          return newErrors;
                                        });
                                      }
                                    }
                                  }}
                                  onBlur={() => {
                                    // Validate on blur
                                    const quantityValue = item.quantity;
                                    if (quantityValue === '' || quantityValue === null || quantityValue === undefined) {
                                      setServiceErrors(prev => ({
                                        ...prev,
                                        [index]: {
                                          ...prev[index],
                                          quantity: 'Quantity is required'
                                        }
                                      }));
                                    } else {
                                      const quantityNum = parseFloat(quantityValue);
                                      if (isNaN(quantityNum)) {
                                        setServiceErrors(prev => ({
                                          ...prev,
                                          [index]: {
                                            ...prev[index],
                                            quantity: 'Please enter a valid number'
                                          }
                                        }));
                                      } else if (quantityNum <= 0) {
                                        setServiceErrors(prev => ({
                                          ...prev,
                                          [index]: {
                                            ...prev[index],
                                            quantity: 'Quantity must be greater than 0'
                                          }
                                        }));
                                      }
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                                    serviceErrors[index]?.quantity 
                                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                                      : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                                  }`}
                                />
                                {serviceErrors[index]?.quantity && (
                                  <span className="text-xs text-red-600 mt-1">{serviceErrors[index].quantity}</span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    handleServiceChange(index, 'unitPrice', value);
                                    // Clear error when user enters valid value
                                    if (value && value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
                                      if (serviceErrors[index]?.unitPrice) {
                                        setServiceErrors(prev => {
                                          const newErrors = { ...prev };
                                          if (newErrors[index]) {
                                            const itemErrors = { ...newErrors[index] };
                                            delete itemErrors.unitPrice;
                                            if (Object.keys(itemErrors).length === 0) {
                                              delete newErrors[index];
                                            } else {
                                              newErrors[index] = itemErrors;
                                            }
                                          }
                                          return newErrors;
                                        });
                                      }
                                    }
                                  }}
                                  onBlur={() => {
                                    // Validate on blur
                                    const unitPriceValue = item.unitPrice;
                                    if (unitPriceValue === '' || unitPriceValue === null || unitPriceValue === undefined) {
                                      setServiceErrors(prev => ({
                                        ...prev,
                                        [index]: {
                                          ...prev[index],
                                          unitPrice: 'Unit price is required'
                                        }
                                      }));
                                    } else {
                                      const unitPriceNum = parseFloat(unitPriceValue);
                                      if (isNaN(unitPriceNum)) {
                                        setServiceErrors(prev => ({
                                          ...prev,
                                          [index]: {
                                            ...prev[index],
                                            unitPrice: 'Please enter a valid number'
                                          }
                                        }));
                                      } else if (unitPriceNum < 0) {
                                        setServiceErrors(prev => ({
                                          ...prev,
                                          [index]: {
                                            ...prev[index],
                                            unitPrice: 'Unit price must be 0 or greater'
                                          }
                                        }));
                                      }
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                                    serviceErrors[index]?.unitPrice 
                                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                                      : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
                                  }`}
                                />
                                {serviceErrors[index]?.unitPrice && (
                                  <span className="text-xs text-red-600 mt-1">{serviceErrors[index].unitPrice}</span>
                                )}
                              </div>
                              <div className="flex items-center">
                                <strong className="text-gray-800">₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}</strong>
                              </div>
                              <div className="flex items-center">
                                <button
                                  className="px-3 py-1.5 text-red-600 border border-red-200 rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-red-50"
                                  onClick={() => handleRemoveService(index)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            {hasFormFields && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="mb-3">
                                  <span className="text-sm font-semibold text-gray-800">Information</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {formFields.map((field, fieldIndex) => renderDynamicField(field, fieldIndex, index))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Total and Status */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-gray-700">Total Amount:</span>
                    <span className="text-lg font-bold text-gray-800">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="text-sm font-semibold text-gray-800 whitespace-nowrap">Status:</label>
                    <select
                      value={invoiceStatus}
                      onChange={(e) => {
                        setInvoiceStatus(e.target.value);
                        if (e.target.value !== 'paid') {
                          setPaymentMethod('');
                          setPaymentReferenceId('');
                        }
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Payment Method Section - Only show when status is "paid" */}
                {invoiceStatus === 'paid' && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Payment Method <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Cash"
                          checked={paymentMethod === 'Cash'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setPaymentReferenceId('');
                          }}
                          className="w-4 h-4 text-[#4A90E2] border-gray-300 focus:ring-[#4A90E2]"
                        />
                        <span className="text-sm text-gray-800">Cash</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Bank Transfer"
                          checked={paymentMethod === 'Bank Transfer'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setPaymentReferenceId('');
                          }}
                          className="w-4 h-4 text-[#4A90E2] border-gray-300 focus:ring-[#4A90E2]"
                        />
                        <span className="text-sm text-gray-800">Bank Transfer</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="UPI"
                          checked={paymentMethod === 'UPI'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setPaymentReferenceId('');
                          }}
                          className="w-4 h-4 text-[#4A90E2] border-gray-300 focus:ring-[#4A90E2]"
                        />
                        <span className="text-sm text-gray-800">UPI</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Other"
                          checked={paymentMethod === 'Other'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setPaymentReferenceId('');
                          }}
                          className="w-4 h-4 text-[#4A90E2] border-gray-300 focus:ring-[#4A90E2]"
                        />
                        <span className="text-sm text-gray-800">Other</span>
                      </label>
                    </div>

                    {/* Payment Reference ID - Only show for Bank Transfer or UPI */}
                    {(paymentMethod === 'Bank Transfer' || paymentMethod === 'UPI') && (
                      <div className="flex flex-col gap-2 mt-4">
                        <label className="text-sm font-semibold text-gray-800">
                          Reference ID
                        </label>
                        <input
                          type="text"
                          value={paymentReferenceId}
                          onChange={(e) => setPaymentReferenceId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
                          placeholder={`Enter ${paymentMethod === 'Bank Transfer' ? 'transaction' : 'UPI'} reference ID`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Create Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                    style={{ backgroundColor: (isCreating || !selectedCustomer || invoiceItems.length === 0) ? '#9CA3AF' : '#4A90E2' }}
                    onMouseEnter={(e) => {
                      if (!isCreating && selectedCustomer && invoiceItems.length > 0) {
                        e.currentTarget.style.backgroundColor = '#357ABD';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCreating && selectedCustomer && invoiceItems.length > 0) {
                        e.currentTarget.style.backgroundColor = '#4A90E2';
                      }
                    }}
                    onClick={handleCreateInvoice}
                    disabled={isCreating || !selectedCustomer || invoiceItems.length === 0}
                  >
                    {isCreating ? (editingInvoiceId ? 'Updating...' : 'Creating...') : (editingInvoiceId ? 'Update Invoice' : 'Create Invoice')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead Modal */}
      {showLeadModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
          onClick={() => !isCreatingLead && setShowLeadModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Mark as Lead</h2>
              <button 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                onClick={() => !isCreatingLead && setShowLeadModal(false)}
                disabled={isCreatingLead}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-col gap-2">
                <label htmlFor="leadComments" className="text-sm font-semibold text-gray-800">
                  Comments <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="leadComments"
                  value={leadComments}
                  onChange={(e) => setLeadComments(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter comments about this lead..."
                  rows="5"
                  disabled={isCreatingLead}
                />
                <small className="text-xs text-gray-500 mt-1">Please provide comments about why this customer is being marked as a lead.</small>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                className="px-5 py-2.5 bg-white text-[#4A90E2] border border-[#4A90E2] rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setShowLeadModal(false);
                  setLeadComments('');
                }}
                disabled={isCreatingLead}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: (isCreatingLead || !leadComments.trim()) ? '#9CA3AF' : '#4A90E2' }}
                onMouseEnter={(e) => {
                  if (!isCreatingLead && leadComments.trim()) {
                    e.currentTarget.style.backgroundColor = '#357ABD';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCreatingLead && leadComments.trim()) {
                    e.currentTarget.style.backgroundColor = '#4A90E2';
                  }
                }}
                onClick={handleMarkAsLead}
                disabled={isCreatingLead || !leadComments.trim()}
              >
                {isCreatingLead ? 'Marking...' : 'Mark as Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Confirmation Dialog */}
      {showLeadConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => !isCreatingLead && setShowLeadConfirmDialog(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Action</h2>
              <p className="text-gray-600 mb-6">
                This customer is already marked as a lead. Do you want to add lead again?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50"
                  onClick={() => setShowLeadConfirmDialog(false)}
                  disabled={isCreatingLead}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ backgroundColor: isCreatingLead ? '#9CA3AF' : '#4A90E2' }}
                  onClick={handleConfirmAddLeadAgain}
                  disabled={isCreatingLead}
                >
                  Yes, Add Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="modal-overlay" onClick={() => !isCreatingCustomer && setShowAddCustomerModal(false)}>
          <div className="modal-content add-customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Customer</h2>
              <button 
                className="modal-close" 
                onClick={() => !isCreatingCustomer && setShowAddCustomerModal(false)}
                disabled={isCreatingCustomer}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="customer-form-grid">
                {/* Name - Required */}
                <div className="form-group">
                  <label htmlFor="newCustomerName">Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="newCustomerName"
                    value={newCustomerData.name}
                    onChange={(e) => {
                      setNewCustomerData(prev => ({ ...prev, name: e.target.value }));
                      if (customerErrors.name) {
                        setCustomerErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    className={customerErrors.name ? 'error' : ''}
                    placeholder="Enter customer name"
                    disabled={isCreatingCustomer}
                  />
                  {customerErrors.name && <span className="error-message">{customerErrors.name}</span>}
                </div>

                {/* Phone - Required */}
                <div className="form-group">
                  <label htmlFor="newCustomerPhone">Phone <span className="required">*</span></label>
                  <input
                    type="tel"
                    id="newCustomerPhone"
                    value={newCustomerData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setNewCustomerData(prev => ({ ...prev, phone: value }));
                      if (customerErrors.phone) {
                        setCustomerErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    className={customerErrors.phone ? 'error' : ''}
                    placeholder="Enter phone number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={isCreatingCustomer}
                  />
                  {customerErrors.phone && <span className="error-message">{customerErrors.phone}</span>}
                </div>

                {/* DOB - Optional */}
                <div className="form-group">
                  <label htmlFor="newCustomerDob">Date of Birth</label>
                  <input
                    type="date"
                    id="newCustomerDob"
                    value={newCustomerData.dob}
                    onChange={(e) => {
                      setNewCustomerData(prev => ({ ...prev, dob: e.target.value }));
                      if (customerErrors.dob) {
                        setCustomerErrors(prev => ({ ...prev, dob: '' }));
                      }
                    }}
                    className={customerErrors.dob ? 'error' : ''}
                    max={new Date().toISOString().split('T')[0]}
                    disabled={isCreatingCustomer}
                  />
                  {customerErrors.dob && <span className="error-message">{customerErrors.dob}</span>}
                </div>

                {/* Zip Code - Required */}
                <div className="form-group">
                  <label htmlFor="newCustomerZipCode">Zip Code <span className="required">*</span></label>
                  <input
                    type="text"
                    id="newCustomerZipCode"
                    value={newCustomerData.zipCode}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewCustomerData(prev => ({ ...prev, zipCode: value }));
                      if (customerErrors.zipCode) {
                        setCustomerErrors(prev => ({ ...prev, zipCode: '' }));
                      }
                      // Auto-fill city and state when zipcode is entered
                      if (value.length === 6) {
                        fetchPincodeDetails(value);
                      } else {
                        setPostOffices([]);
                      }
                    }}
                    className={customerErrors.zipCode ? 'error' : ''}
                    placeholder="Enter zip code"
                    disabled={isCreatingCustomer}
                    maxLength={6}
                  />
                  {customerErrors.zipCode && <span className="error-message">{customerErrors.zipCode}</span>}
                </div>

                {/* Address - Optional */}
                <div className="form-group full-width">
                  <label htmlFor="newCustomerAddress">Address</label>
                  <input
                    type="text"
                    id="newCustomerAddress"
                    value={newCustomerData.address}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter street address"
                    disabled={isCreatingCustomer}
                  />
                </div>

                {/* Locality - Optional */}
                <div className="form-group">
                  <label htmlFor="newCustomerLocality">Locality</label>
                  {postOffices.length > 0 ? (
                    <select
                      id="newCustomerLocality"
                      value={newCustomerData.locality}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, locality: e.target.value }))}
                      disabled={isCreatingCustomer}
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
                      id="newCustomerLocality"
                      value={newCustomerData.locality}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, locality: e.target.value }))}
                      placeholder="Enter locality / Post Office"
                      disabled={isCreatingCustomer}
                    />
                  )}
                </div>

                {/* City - Optional */}
                <div className="form-group">
                  <label htmlFor="newCustomerCity">City</label>
                  <input
                    type="text"
                    id="newCustomerCity"
                    value={newCustomerData.city}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Enter city"
                    disabled={isCreatingCustomer}
                  />
                </div>

                {/* State - Optional */}
                <div className="form-group">
                  <label htmlFor="newCustomerState">State</label>
                  <input
                    type="text"
                    id="newCustomerState"
                    value={newCustomerData.state}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Enter state"
                    disabled={isCreatingCustomer}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  if (!isCreatingCustomer) {
                    setShowAddCustomerModal(false);
                    setNewCustomerData({
                      name: '',
                      phone: '',
                      dob: '',
                      zipCode: '',
                      whatsappNumber: '',
                      address: '',
                      locality: '',
                      city: '',
                      state: '',
                      country: '',
                      gender: ''
                    });
                    setCustomerErrors({});
                    setPostOffices([]);
                  }
                }}
                disabled={isCreatingCustomer}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateCustomer}
                disabled={isCreatingCustomer}
              >
                {isCreatingCustomer ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showInvoiceModal && (
        <div 
          className="modal-overlay" 
          onClick={closeViewModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            margin: 0
          }}
        >
          <div 
            className="modal-content invoice-view-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '95vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              margin: 0,
              position: 'relative'
            }}
          >
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', margin: 0 }}>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                {viewingInvoice ? `Invoice ${viewingInvoice.invoiceNumber || `INV-${viewingInvoice.id}`}` : 'Loading...'}
              </h3>
              <button 
                className="modal-close" 
                onClick={closeViewModal}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '24px', 
                  cursor: 'pointer', 
                  padding: '4px 8px',
                  color: '#6b7280',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  margin: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#111827';
                  e.target.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#6b7280';
                  e.target.style.backgroundColor = 'transparent';
                }}
              >×</button>
            </div>
            <div className="modal-body invoice-view-body" style={{ padding: '24px', overflow: 'auto', flex: 1, backgroundColor: 'white', margin: 0 }}>
              {!viewingInvoice ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading invoice details...</div>
                  </div>
              ) : (() => {
                const invoiceDate = viewingInvoice.createdOn 
                            ? new Date(viewingInvoice.createdOn).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                      month: 'long', 
                                day: 'numeric' 
                              })
                            : new Date().toLocaleDateString('en-US', { 
                                year: 'numeric', 
                      month: 'long', 
                                day: 'numeric' 
                    });

                const subtotal = viewingInvoice.items.reduce((sum, item) => {
                  return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0));
                }, 0);
                
                const salesTax = 0;
                const pnp = 0;
                const totalDue = parseFloat(viewingInvoice.totalAmount) || subtotal;

                const customerAddress = viewingInvoice.customer?.address || '';
                const customerCity = viewingInvoice.customer?.city || '';
                const customerState = viewingInvoice.customer?.state || '';
                const customerZip = viewingInvoice.customer?.zipCode || '';
                const customerLocation = `${customerCity}${customerCity && customerState ? ', ' : ''}${customerState} ${customerZip}`.trim();

                return (
                  <div id="invoice-modal-content" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', color: '#000', background: 'white', lineHeight: '1.4' }}>
                    <div className="invoice-container" style={{ maxWidth: '800px', margin: '0 auto', background: 'white' }}>
                      <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
                        <div className="invoice-company" style={{ flex: 1 }}>
                          <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px', color: '#000', margin: 0 }}>SriRam E-sevaiMiyam</h1>
                          <p style={{ fontSize: '11px', color: '#000', margin: '2px 0' }}>[Street Address]</p>
                          <p style={{ fontSize: '11px', color: '#000', margin: '2px 0' }}>[Town, County Postal Code]</p>
                          <p style={{ fontSize: '11px', color: '#000', margin: '2px 0' }}>Phone [01234 567890] Fax [01234 567890]</p>
                        </div>
                        <div className="invoice-title-section" style={{ textAlign: 'right', flex: 1 }}>
                          <h1 className="invoice-title" style={{ fontSize: '42px', fontWeight: 'bold', color: '#000', marginBottom: '8px', letterSpacing: '2px', margin: '0 0 8px 0' }}>INVOICE</h1>
                          <div className="invoice-meta" style={{ marginTop: '8px' }}>
                            <div className="invoice-meta-row" style={{ marginBottom: '4px', fontSize: '11px' }}>
                              <span className="invoice-meta-label" style={{ fontWeight: 'normal', marginRight: '8px' }}>INVOICE No</span>
                              <span className="invoice-meta-value" style={{ fontWeight: 'normal' }}>{viewingInvoice.invoiceNumber || `INV-${viewingInvoice.id}`}</span>
                            </div>
                            <div className="invoice-meta-row" style={{ marginBottom: '4px', fontSize: '11px' }}>
                              <span className="invoice-meta-label" style={{ fontWeight: 'normal', marginRight: '8px' }}>DATE:</span>
                              <span className="invoice-meta-value" style={{ fontWeight: 'normal' }}>{invoiceDate}</span>
                            </div>
                          </div>
                  </div>
                </div>
                
                      <div className="invoice-addresses" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '30px' }}>
                        <div className="invoice-address-section" style={{ flex: 1 }}>
                          <div className="address-label" style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px', color: '#000' }}>Billing Address:</div>
                          <div className="address-content" style={{ fontSize: '11px', color: '#000' }}>
                            <p style={{ margin: '2px 0' }}>{viewingInvoice.customer?.name || 'Name'}</p>
                            <p style={{ margin: '2px 0' }}>{viewingInvoice.customer?.company || 'Company'}</p>
                            <p style={{ margin: '2px 0' }}>{customerAddress || 'Address'}</p>
                            <p style={{ margin: '2px 0' }}>{customerLocation || 'Town, County Postal Code'}</p>
                            <p style={{ margin: '2px 0' }}>{viewingInvoice.customer?.phone || 'Phone'}</p>
                          </div>
                        </div>
                        <div className="invoice-address-section" style={{ flex: 1 }}>
                          <div className="address-label" style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px', color: '#000' }}>Delivery Address:</div>
                          <div className="address-content" style={{ fontSize: '11px', color: '#000' }}>
                            <p style={{ margin: '2px 0' }}>{viewingInvoice.customer?.name || 'Name'}</p>
                            <p style={{ margin: '2px 0' }}>{viewingInvoice.customer?.company || 'Company'}</p>
                            <p style={{ margin: '2px 0' }}>{customerAddress || 'Address'}</p>
                            <p style={{ margin: '2px 0' }}>{customerLocation || 'Town, County Postal Code'}</p>
                            <p style={{ margin: '2px 0' }}>{viewingInvoice.customer?.phone || 'Phone'}</p>
                          </div>
                  </div>
                </div>
                
                      <div className="invoice-instructions" style={{ marginBottom: '15px', fontSize: '11px', color: '#000' }}>
                        <p style={{ margin: 0 }}>Comments or special instructions:</p>
                      </div>
                      
                      <table className="invoice-info-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '10px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #ddd' }}>
                            <td className="info-label" style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'bold', fontSize: '9px', color: '#000' }}>SALESPERSON</td>
                            <td className="info-label" style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'bold', fontSize: '9px', color: '#000' }}>P.O. NUMBER</td>
                            <td className="info-label" style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'bold', fontSize: '9px', color: '#000' }}>SENT DATE</td>
                            <td className="info-label" style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'bold', fontSize: '9px', color: '#000' }}>SENT VIA</td>
                            <td className="info-label" style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'bold', fontSize: '9px', color: '#000' }}>F.O.B. POINT</td>
                            <td className="info-label" style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'bold', fontSize: '9px', color: '#000' }}>TERMS</td>
                          </tr>
                          <tr>
                            <td className="info-value" style={{ padding: '6px 4px', textAlign: 'left', fontSize: '10px', color: '#000' }}></td>
                            <td className="info-value" style={{ padding: '6px 4px', textAlign: 'left', fontSize: '10px', color: '#000' }}></td>
                            <td className="info-value" style={{ padding: '6px 4px', textAlign: 'left', fontSize: '10px', color: '#000' }}></td>
                            <td className="info-value" style={{ padding: '6px 4px', textAlign: 'left', fontSize: '10px', color: '#000' }}></td>
                            <td className="info-value" style={{ padding: '6px 4px', textAlign: 'left', fontSize: '10px', color: '#000' }}></td>
                            <td className="info-value" style={{ padding: '6px 4px', textAlign: 'left', fontSize: '10px', color: '#000' }}>Due on receipt</td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <table className="invoice-items" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', border: '1px solid #000' }}>
                        <thead style={{ background: '#f0f0f0' }}>
                          <tr>
                            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', fontSize: '10px', border: '1px solid #000', borderBottom: '2px solid #000' }}>QUANTITY</th>
                            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', fontSize: '10px', border: '1px solid #000', borderBottom: '2px solid #000' }}>DESCRIPTION</th>
                            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', border: '1px solid #000', borderBottom: '2px solid #000' }}>UNIT PRICE</th>
                            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', border: '1px solid #000', borderBottom: '2px solid #000' }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                          {viewingInvoice.items.map((item, index) => {
                            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                            const description = item.serviceName;
                            
                            return (
                              <tr key={index}>
                                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', borderRight: '1px solid #000' }}>{item.quantity || ''}</td>
                                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', borderRight: '1px solid #000' }}>{description}</td>
                                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', borderRight: '1px solid #000', textAlign: 'right' }}>₹{parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', borderRight: '1px solid #000', textAlign: 'right' }}>₹{itemTotal.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                  </tbody>
                </table>
                
                      <div className="invoice-summary" style={{ width: '100%', maxWidth: '300px', marginLeft: 'auto', marginBottom: '30px' }}>
                        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: '11px', borderBottom: '1px solid #ddd' }}>
                          <div className="summary-label" style={{ fontWeight: 'bold', color: '#000' }}>SUBTOTAL</div>
                          <div className="summary-value" style={{ color: '#000', textAlign: 'right' }}>₹{subtotal.toFixed(2)}</div>
                  </div>
                        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: '11px', borderBottom: '1px solid #ddd' }}>
                          <div className="summary-label" style={{ fontWeight: 'bold', color: '#000' }}>SALES TAX</div>
                          <div className="summary-value" style={{ color: '#000', textAlign: 'right' }}>₹{salesTax.toFixed(2)}</div>
                </div>
                        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: '11px', borderBottom: '1px solid #ddd' }}>
                          <div className="summary-label" style={{ fontWeight: 'bold', color: '#000' }}>P&P</div>
                          <div className="summary-value" style={{ color: '#000', textAlign: 'right' }}>₹{pnp.toFixed(2)}</div>
                    </div>
                        <div className="summary-row total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', fontSize: '12px', borderTop: '2px solid #000', borderBottom: '2px solid #000', fontWeight: 'bold', marginTop: '4px' }}>
                          <div className="summary-label" style={{ fontWeight: 'bold', color: '#000' }}>TOTAL DUE</div>
                          <div className="summary-value" style={{ color: '#000', textAlign: 'right' }}>₹{totalDue.toFixed(2)}</div>
                  </div>
                      </div>
                      
                      <div className="invoice-footer" style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '10px', color: '#000' }}>
                        <p style={{ margin: '4px 0' }}>Make all cheques payable to SriRam E-sevaiMiyam</p>
                        <p style={{ margin: '4px 0' }}>If you have any questions concerning this invoice, contact [Name, Phone Number, E-mail]</p>
                        <p className="footer-thanks" style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '10px', letterSpacing: '1px', margin: '10px 0 0 0' }}>THANK YOU FOR YOUR BUSINESS!</p>
                </div>
              </div>
            </div>
                );
              })()}
            </div>
            <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f9fafb', margin: 0 }}>
              <button
                className="btn-secondary"
                onClick={closeViewModal}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '6px', 
                  border: '1px solid #d1d5db', 
                  background: 'white', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  transition: 'all 0.2s',
                  margin: 0
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                Close
              </button>
              {viewingInvoice && (
              <button
                className="btn-primary"
                onClick={() => {
                  handleDownloadInvoice(viewingInvoice.id);
                }}
                  style={{ 
                    padding: '10px 20px', 
                    borderRadius: '6px', 
                    border: 'none', 
                    background: '#4A90E2', 
                    color: 'white', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    margin: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#357ABD'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#4A90E2'}
              >
                Download PDF
              </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
