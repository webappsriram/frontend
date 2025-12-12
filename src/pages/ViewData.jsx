import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';

const ViewData = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formDataList, setFormDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const itemsPerPage = 50;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceName, setSelectedServiceName] = useState('');
  
  // Add Data Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [formFields, setFormFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({}); // { fieldName: 'error message' }

  useEffect(() => {
    fetchFormData(currentPage);
  }, [currentPage, searchQuery, selectedServiceName]);

  const fetchFormData = async (page = 1) => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      let url = `${API_ENDPOINTS.FORM_DATA.BASE}?page=${page}&limit=${itemsPerPage}`;
      
      if (selectedServiceName) {
        url += `&serviceName=${encodeURIComponent(selectedServiceName)}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setFormDataList(data.data.formData || []);
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
        }
      } else {
        console.error('Failed to fetch form data');
        setFormDataList([]);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
      setFormDataList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_ENDPOINTS.SERVICES.BASE}?page=1&limit=1000`, {
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

  // Get unique service names for dropdown
  const uniqueServiceNames = useMemo(() => {
    const serviceNames = new Set();
    formDataList.forEach(entry => {
      if (entry.serviceName) {
        serviceNames.add(entry.serviceName);
      }
    });
    return Array.from(serviceNames).sort();
  }, [formDataList]);

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    fetchServices();
    setSelectedServiceId('');
    setSelectedService(null);
    setFormFields({});
    setFormErrors({});
  };

  const handleServiceChange = (serviceId) => {
    setSelectedServiceId(serviceId);
    if (!serviceId || serviceId === '') {
      setSelectedService(null);
      setFormFields({});
      setFormErrors({});
      return;
    }
    const service = availableServices.find(s => s.id === parseInt(serviceId) || s.id === serviceId);
    setSelectedService(service);
    
    if (service) {
      // Parse formSchema
      let formSchema = service.formSchema || service.form_schema;
      if (formSchema && typeof formSchema === 'string') {
        try {
          formSchema = JSON.parse(formSchema);
        } catch (e) {
          console.error('Error parsing formSchema:', e);
          formSchema = null;
        }
      }

      // Initialize form fields
      const initialFields = {};
      if (formSchema && formSchema.fields && Array.isArray(formSchema.fields)) {
        formSchema.fields.forEach(field => {
          if (field && field.name && field.type !== 'custom') {
            initialFields[field.name] = field.defaultValue || '';
          }
        });
      }
      setFormFields(initialFields);
      setFormErrors({});
    } else {
      setFormFields({});
      setFormErrors({});
    }
  };

  // Format phone number (Indian format: XXXXX XXXXX)
  const formatPhoneNumber = (value) => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      if (digits.length <= 5) {
        return digits;
      } else if (digits.length <= 10) {
        return `${digits.slice(0, 5)} ${digits.slice(5)}`;
      }
    }
    return digits.slice(0, 10).replace(/(\d{5})(\d{5})/, '$1 $2');
  };

  // Parse date from various formats to YYYY-MM-DD
  const parseDateValue = (value) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toISOString().split('T')[0];
  };

  // Check if a value is a valid number
  const isValidNumber = (value, type) => {
    if (value === '' || value === null || value === undefined) return false;
    const str = String(value).trim();
    if (str === '' || str === '-') return false;
    const num = parseFloat(str);
    if (isNaN(num) || !isFinite(num)) return false;
    if (type === 'integer') {
      return Number.isInteger(num);
    }
    return true;
  };

  // Validate form fields
  const validateFormFields = () => {
    if (!selectedService) return false;

    const errors = {};
    let hasErrors = false;

    let formSchema = selectedService.formSchema || selectedService.form_schema;
    if (formSchema && typeof formSchema === 'string') {
      try {
        formSchema = JSON.parse(formSchema);
      } catch (e) {
        return false;
      }
    }

    if (formSchema && formSchema.fields && Array.isArray(formSchema.fields)) {
      formSchema.fields.forEach(field => {
        if (field.type === 'custom') return;

        const fieldName = field.name;
        const fieldValue = formFields[fieldName];

        // Validate required fields
        if (field.required) {
          if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
            errors[fieldName] = `${field.label || fieldName} is required`;
            hasErrors = true;
          }
        }

        // Validate field format for both required and optional fields (if they have values)
        if (fieldValue && (typeof fieldValue === 'string' && fieldValue.trim() !== '')) {
          if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(fieldValue.trim())) {
              errors[fieldName] = 'Please enter a valid email address';
              hasErrors = true;
            }
          } else if (field.type === 'phone' || field.type === 'tel') {
            const digits = fieldValue.replace(/\D/g, '');
            if (digits.length !== 10) {
              errors[fieldName] = 'Please enter a valid 10-digit phone number';
              hasErrors = true;
            }
          } else if (field.type === 'number' || field.type === 'integer' || field.type === 'decimal') {
            const trimmedValue = String(fieldValue).trim();
            if (trimmedValue === '' || trimmedValue === '-' || isNaN(parseFloat(trimmedValue))) {
              errors[fieldName] = 'Please enter a valid number';
              hasErrors = true;
            } else {
              const num = parseFloat(trimmedValue);
              if (isNaN(num) || !isFinite(num)) {
                errors[fieldName] = 'Please enter a valid number';
                hasErrors = true;
              } else if (field.type === 'integer' && !Number.isInteger(num)) {
                errors[fieldName] = 'Please enter a valid whole number';
                hasErrors = true;
              }
            }
          }
        }
      });
    }

    setFormErrors(errors);
    return !hasErrors;
  };

  const handleFieldChange = (fieldName, value, field) => {
    setFormFields(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error when user starts typing
    if (formErrors[fieldName]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    // Real-time validation for specific field types
    if (field) {
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          setFormErrors(prev => ({
            ...prev,
            [fieldName]: 'Please enter a valid email address'
          }));
        }
      } else if ((field.type === 'phone' || field.type === 'tel') && value) {
        const digits = value.replace(/\D/g, '');
        if (digits.length > 0 && digits.length !== 10) {
          setFormErrors(prev => ({
            ...prev,
            [fieldName]: 'Please enter a valid 10-digit phone number'
          }));
        }
      } else if ((field.type === 'number' || field.type === 'integer' || field.type === 'decimal') && value) {
        if (!isValidNumber(value, field.type)) {
          setFormErrors(prev => ({
            ...prev,
            [fieldName]: 'Please enter a valid number'
          }));
        }
      }
    }
  };

  const handleSubmitFormData = async () => {
    if (!selectedServiceId || !selectedService) {
      alert('Please select a service');
      return;
    }

    // Validate form fields
    if (!validateFormFields()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('.form-field-error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      alert('Please fill in all required fields correctly');
      return;
    }

    if (Object.keys(formFields).length === 0) {
      alert('Please fill in at least one form field');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.FORM_DATA.BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: parseInt(selectedServiceId),
          serviceName: selectedService.name,
          formData: formFields
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Form data added successfully!');
          setShowAddModal(false);
          setSelectedServiceId('');
          setSelectedService(null);
          setFormFields({});
          setFormErrors({});
          fetchFormData(currentPage);
        } else {
          alert(data.message || 'Failed to add form data');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to add form data');
      }
    } catch (error) {
      console.error('Error adding form data:', error);
      alert('Failed to add form data. Please try again.');
    } finally {
      setIsSubmitting(false);
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatFieldName = (key) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderFormField = (field) => {
    if (!field || !field.name) return null;
    if (field.type === 'custom') return null;

    const fieldType = field.type || 'text';
    const rawValue = formFields[field.name] || '';
    const hasError = formErrors[field.name];

    switch (fieldType) {
      case 'text':
      case 'email':
      case 'tel':
        const displayTextValue = rawValue;
        return (
          <div className="flex flex-col gap-1">
            <input
              type={fieldType === 'email' ? 'email' : fieldType === 'tel' ? 'tel' : 'text'}
              value={displayTextValue}
              onChange={(e) => {
                let value = e.target.value;
                if (field.type === 'email') {
                  value = value.trim().toLowerCase();
                }
                handleFieldChange(field.name, value, field);
              }}
              onBlur={(e) => {
                if (field.type === 'email' && e.target.value) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(e.target.value)) {
                    setFormErrors(prev => ({
                      ...prev,
                      [field.name]: 'Please enter a valid email address'
                    }));
                  }
                }
              }}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all form-field-error ${
                hasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || field.name}`}
              maxLength={field.maxLength || undefined}
            />
            {hasError && (
              <span className="text-xs text-red-600">{hasError}</span>
            )}
          </div>
        );
      case 'phone':
        const displayPhoneValue = formatPhoneNumber(rawValue);
        return (
          <div className="flex flex-col gap-1">
            <input
              type="tel"
              value={displayPhoneValue}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '');
                const limitedDigits = digitsOnly.slice(0, 10);
                handleFieldChange(field.name, limitedDigits, field);
              }}
              onBlur={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (field.required && digits.length !== 10) {
                  setFormErrors(prev => ({
                    ...prev,
                    [field.name]: 'Please enter a valid 10-digit phone number'
                  }));
                } else if (digits.length > 0 && digits.length !== 10) {
                  setFormErrors(prev => ({
                    ...prev,
                    [field.name]: 'Please enter a valid 10-digit phone number'
                  }));
                }
              }}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all form-field-error ${
                hasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || field.name} (10 digits)`}
              maxLength={12}
            />
            {hasError && (
              <span className="text-xs text-red-600">{hasError}</span>
            )}
          </div>
        );
      case 'date':
        const formattedDateValue = parseDateValue(rawValue);
        return (
          <div className="flex flex-col gap-1">
            <input
              type="date"
              value={formattedDateValue}
              onChange={(e) => {
                handleFieldChange(field.name, e.target.value, field);
              }}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all form-field-error ${
                hasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
            />
            {hasError && (
              <span className="text-xs text-red-600">{hasError}</span>
            )}
          </div>
        );
      case 'textarea':
        return (
          <div className="flex flex-col gap-1">
            <textarea
              value={rawValue}
              onChange={(e) => {
                handleFieldChange(field.name, e.target.value, field);
              }}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all resize-none form-field-error ${
                hasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || field.name}`}
              rows={field.rows || 3}
            />
            {hasError && (
              <span className="text-xs text-red-600">{hasError}</span>
            )}
          </div>
        );
      case 'number':
      case 'integer':
      case 'decimal':
        const displayValue = rawValue || '';
        return (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={displayValue}
              onChange={(e) => {
                let value = e.target.value;
                
                if (field.type === 'integer') {
                  value = value.replace(/[^\d-]/g, '');
                  if (value.indexOf('-') > 0) {
                    value = value.replace(/-/g, '');
                  }
                  if (value.startsWith('-')) {
                    value = '-' + value.replace(/-/g, '');
                  }
                } else {
                  value = value.replace(/[^\d.-]/g, '');
                  if (value.indexOf('-') > 0) {
                    value = value.replace(/-/g, '');
                  }
                  if (value.startsWith('-')) {
                    value = '-' + value.replace(/-/g, '');
                  }
                  const parts = value.split('.');
                  if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                  }
                }
                
                handleFieldChange(field.name, value, field);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value === '' || value === '-') {
                  if (field.required) {
                    setFormErrors(prev => ({
                      ...prev,
                      [field.name]: `${field.label || field.name} is required`
                    }));
                  }
                  return;
                }
                
                if (!isValidNumber(value, field.type)) {
                  setFormErrors(prev => ({
                    ...prev,
                    [field.name]: 'Please enter a valid number'
                  }));
                }
              }}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all form-field-error ${
                hasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || field.name}`}
            />
            {hasError && (
              <span className="text-xs text-red-600">{hasError}</span>
            )}
          </div>
        );
      case 'select':
      case 'dropdown': {
        // Get options from field.options or field.config.options
        const options = field.options || field.config?.options || [];
        return (
          <div className="flex flex-col gap-1">
            <select
              value={rawValue || ''}
              onChange={(e) => {
                handleFieldChange(field.name, e.target.value, field);
                // Clear error when user selects a value
                if (hasError) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field.name];
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all cursor-pointer form-field-error ${
                hasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
            >
              <option value="">Select {field.label || field.name}</option>
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
              <span className="text-xs text-red-600">{hasError}</span>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={rawValue}
              onChange={(e) => {
                handleFieldChange(field.name, e.target.value, field);
              }}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all form-field-error ${
                hasError 
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-[#4A90E2] focus:ring-[#4A90E2]/10'
              }`}
              placeholder={field.placeholder || `Enter ${field.label || field.name}`}
            />
            {hasError && (
              <span className="text-xs text-red-600">{hasError}</span>
            )}
          </div>
        );
    }
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
        <div className="flex-1 p-4 md:p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">View Data</h1>
              <p className="text-sm text-gray-600">View all form data from invoices</p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-[#4A90E2] text-white rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-[#357ABD] hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Data
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg p-4 shadow-sm mb-5">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="w-full sm:w-auto sm:min-w-[200px]">
                <select
                  value={selectedServiceName}
                  onChange={(e) => {
                    setSelectedServiceName(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all cursor-pointer"
                >
                  <option value="">All Forms</option>
                  {uniqueServiceNames.map((serviceName) => (
                    <option key={serviceName} value={serviceName}>
                      {serviceName}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Search form data values..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto sm:max-w-md px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all"
              />
            </div>
          </div>

          {/* Form Data List */}
          {isLoading ? (
            <div className="bg-white rounded-lg p-8 shadow-sm text-center">
              <div className="text-gray-500">Loading form data...</div>
            </div>
          ) : formDataList.length === 0 ? (
            <div className="bg-white rounded-lg p-8 shadow-sm text-center">
              <div className="text-gray-500">
                {searchQuery || selectedServiceName ? 'No form data found matching your search' : 'No form data available'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {formDataList.map((entry) => {
                const formDataEntries = Object.entries(entry.formData);
                const fieldsPerRow = 2;
                const rows = [];
                
                for (let i = 0; i < formDataEntries.length; i += fieldsPerRow) {
                  rows.push(formDataEntries.slice(i, i + fieldsPerRow));
                }

                return (
                  <div key={entry.id} className="bg-white rounded-lg shadow-sm p-5">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{entry.serviceName}</h3>
                      {entry.invoiceNumber && (
                        <div className="text-xs text-gray-500">
                          Invoice: {entry.invoiceNumber} | Customer: {entry.customerName} - {entry.customerPhone}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {rows.map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {row.map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-1">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                {formatFieldName(key)}
                              </div>
                              <div className="text-sm text-gray-800 break-words bg-gray-50 px-3 py-2 rounded-md min-h-[40px]">
                                {value !== null && value !== undefined && value !== '' ? (
                                  String(value)
                                ) : (
                                  <span className="text-gray-400 italic">Not provided</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {row.length < fieldsPerRow && (
                            <div className="hidden md:block"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && formDataList.length > 0 && pagination.totalPages > 1 && (
            <div className="mt-5">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Data Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !isSubmitting && setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Add Form Data</h2>
              <button 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                onClick={() => !isSubmitting && setShowAddModal(false)}
                disabled={isSubmitting}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Select Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedServiceId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleServiceChange(value);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 transition-all cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <option value="">Select a service</option>
                    {availableServices.map((service) => (
                      <option key={service.id} value={String(service.id)}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Form Fields */}
                {selectedService && selectedService.formSchema && (() => {
                  let formSchema = selectedService.formSchema || selectedService.form_schema;
                  if (formSchema && typeof formSchema === 'string') {
                    try {
                      formSchema = JSON.parse(formSchema);
                    } catch (e) {
                      return null;
                    }
                  }

                  const fields = formSchema?.fields || [];
                  const validFields = fields.filter(field => field && field.name && field.type !== 'custom');

                  if (validFields.length === 0) {
                    return (
                      <div className="text-sm text-gray-500 italic">
                        No form fields defined for this service
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Form Fields</h3>
                      {validFields.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            {field.label || formatFieldName(field.name)}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderFormField(field)}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowAddModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2.5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: isSubmitting ? '#9CA3AF' : '#4A90E2' }}
                onClick={handleSubmitFormData}
                disabled={isSubmitting || !selectedServiceId}
              >
                {isSubmitting ? 'Adding...' : 'Add Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewData;
