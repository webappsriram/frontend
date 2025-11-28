import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ServicesTable from '../components/ServicesTable';
import { hasRole, getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';
import './CustomerServices.css';

const CustomerServices = () => {
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
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceCurrentPage, setServiceCurrentPage] = useState(1);
  const [servicePagination, setServicePagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const serviceItemsPerPage = 10;
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [isLoadingAvailableServices, setIsLoadingAvailableServices] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [editingServiceRecord, setEditingServiceRecord] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    serviceId: '',
    dynamicFields: {},
    commands: []
  });
  const [serviceErrors, setServiceErrors] = useState({});
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [selectedServiceForCommands, setSelectedServiceForCommands] = useState(null);
  const [serviceCommands, setServiceCommands] = useState([]);
  const [isLoadingCommands, setIsLoadingCommands] = useState(false);
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  useEffect(() => {
    fetchCustomer();
    if (serviceCurrentPage !== 1) {
      setServiceCurrentPage(1);
    } else {
      fetchCustomerServices(1);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCustomerServices(serviceCurrentPage);
    }
  }, [serviceCurrentPage, id]);

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

  const fetchCustomerServices = async (page = 1) => {
    try {
      setIsLoadingServices(true);
      const token = getAuthToken();
      const response = await fetch(`${API_ENDPOINTS.CUSTOMERS.SERVICES(id)}?page=${page}&limit=${serviceItemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const servicesList = data.data.services || [];
          setServices(servicesList);
          
          if (data.data.pagination) {
            setServicePagination(data.data.pagination);
          } else {
            const total = servicesList.length;
            const paginationData = {
              page: page,
              limit: serviceItemsPerPage,
              total: total,
              totalPages: Math.ceil(total / serviceItemsPerPage) || 1
            };
            setServicePagination(paginationData);
          }
        }
      } else {
        console.error('Failed to fetch customer services');
      }
    } catch (error) {
      console.error('Error fetching customer services:', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    if (searchQuery && serviceCurrentPage !== 1) {
      setServiceCurrentPage(1);
    }
  }, [searchQuery]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleAddService = () => {
    setEditingServiceRecord(null);
    setServiceFormData({ 
      serviceId: '', 
      dynamicFields: {},
      commands: []
    });
    setSelectedService(null);
    setServiceErrors({});
    setShowAddServiceModal(true);
    fetchAvailableServices();
  };

  const handleEditService = async (serviceRecord) => {
    try {
      const token = getAuthToken();
      // Use the correct endpoint from SERVICES API
      const response = await fetch(
        API_ENDPOINTS.SERVICES.RECORD_BY_ID(serviceRecord.serviceId, serviceRecord.id),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.serviceRecord) {
          const record = data.data.serviceRecord;
          setEditingServiceRecord(record);
          
          // Fetch available services to get form schema
          const servicesListResponse = await fetch(API_ENDPOINTS.SERVICES.BASE, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (servicesListResponse.ok) {
            const servicesData = await servicesListResponse.json();
            const services = servicesData.success && servicesData.data && servicesData.data.services 
              ? servicesData.data.services 
              : [];
            
            // Update available services state
            setAvailableServices(services);
            
            // Find the service definition (handle both string and number IDs)
            const serviceDef = services.find(s => 
              s.id === serviceRecord.serviceId || 
              s.id === parseInt(serviceRecord.serviceId) || 
              parseInt(s.id) === serviceRecord.serviceId
            );
            
            if (serviceDef) {
              setSelectedService(serviceDef);
              
              // Initialize form data with record values
              const dynamicFields = {};
              const formSchema = serviceDef?.formSchema || serviceDef?.form_schema;
              if (formSchema && formSchema.fields) {
                formSchema.fields.forEach(field => {
                  if (field.type !== 'custom') {
                    dynamicFields[field.name] = record[field.name] || field.defaultValue || '';
                  }
                });
              }
              
              // Recalculate custom fields
              const fieldsWithCalculated = recalculateCustomFields(dynamicFields, serviceDef);
              
              setServiceFormData({
                serviceId: serviceRecord.serviceId.toString(),
                dynamicFields: fieldsWithCalculated,
                commands: []
              });
              setServiceErrors({});
              setShowAddServiceModal(true);
            } else {
              // Service definition not found - log for debugging
              console.error('Service definition not found:', {
                serviceId: serviceRecord.serviceId,
                serviceIdType: typeof serviceRecord.serviceId,
                availableServices: services.map(s => ({ id: s.id, idType: typeof s.id, name: s.name }))
              });
              alert(`Service definition not found for service ID: ${serviceRecord.serviceId}. The service may have been deleted.`);
            }
          } else {
            alert('Failed to fetch service definitions');
          }
        } else {
          alert(data.message || 'Failed to load service details');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to load service details');
      }
    } catch (error) {
      console.error('Error fetching service record:', error);
      alert('Failed to load service details: ' + (error.message || 'Network error'));
    }
  };

  const handleDeleteService = async (serviceRecord) => {
    if (!window.confirm(`Are you sure you want to delete this service record?`)) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_ENDPOINTS.CUSTOMERS.BASE}/${id}/services/${serviceRecord.serviceId}/records/${serviceRecord.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchCustomerServices(serviceCurrentPage);
      } else {
        throw new Error(data.message || 'Failed to delete service record');
      }
    } catch (error) {
      console.error('Error deleting service record:', error);
      alert(`Failed to delete service: ${error.message}`);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      setIsLoadingAvailableServices(true);
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.SERVICES.BASE, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.services) {
          setAvailableServices(data.data.services);
        }
      } else {
        console.error('Failed to fetch available services');
      }
    } catch (error) {
      console.error('Error fetching available services:', error);
    } finally {
      setIsLoadingAvailableServices(false);
    }
  };

  const handleCloseAddServiceModal = () => {
    setShowAddServiceModal(false);
    setServiceFormData({ 
      serviceId: '', 
      dynamicFields: {},
      commands: []
    });
    setServiceErrors({});
    setSelectedService(null);
    setEditingServiceRecord(null);
  };

  const handleViewCommands = async (service) => {
    setSelectedServiceForCommands(service);
    setShowCommandsModal(true);
    setIsLoadingCommands(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_ENDPOINTS.CUSTOMERS.BASE}/${id}/services/${service.serviceId}/records/${service.id}/commands`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setServiceCommands(data.data.commands || []);
        }
      }
    } catch (error) {
      console.error('Error fetching commands:', error);
    } finally {
      setIsLoadingCommands(false);
    }
  };

  // Helper function to recalculate custom fields
  const recalculateCustomFields = (dynamicFields, service) => {
    const formSchema = service?.formSchema || service?.form_schema;
    if (!service || !formSchema || !formSchema.fields) {
      return dynamicFields;
    }
    
    const newFields = { ...dynamicFields };
    formSchema.fields.forEach(field => {
      if (field.type === 'custom' && field.config && field.config.formula) {
        newFields[field.name] = evaluateFormula(
          field.config.formula,
          newFields,
          formSchema.fields
        );
      }
    });
    return newFields;
  };

  const handleServiceFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'serviceId') {
      const service = availableServices.find(s => s.id === parseInt(value));
      if (service) {
        setSelectedService(service);
        if (!editingServiceRecord) {
          const dynamicFields = {};
          const formSchema = service?.formSchema || service?.form_schema;
          if (formSchema && formSchema.fields) {
            formSchema.fields.forEach(field => {
              if (field.type !== 'custom') {
                dynamicFields[field.name] = field.defaultValue || '';
              }
            });
          }
          // Recalculate custom fields
          const fieldsWithCalculated = recalculateCustomFields(dynamicFields, service);
          setServiceFormData(prev => ({
            serviceId: value,
            dynamicFields: fieldsWithCalculated,
            commands: prev.commands || []
          }));
        } else {
          setServiceFormData(prev => {
            const recalculated = recalculateCustomFields(prev.dynamicFields, service);
            return {
              ...prev,
              serviceId: value,
              dynamicFields: recalculated,
              commands: prev.commands || []
            };
          });
        }
      } else {
        setSelectedService(null);
        setServiceFormData(prev => ({
          ...prev,
          serviceId: value,
          dynamicFields: {},
          commands: prev.commands || []
        }));
      }
    } else {
      setServiceFormData(prev => ({
        ...prev,
        [name]: value,
        commands: prev.commands || []
      }));
    }
    
    if (serviceErrors[name]) {
      setServiceErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Formula evaluation function
  const evaluateFormula = (formula, dynamicFields, allFields) => {
    if (!formula) return '';
    
    try {
      // Replace field references {fieldName} with actual values
      let expression = formula;
      const fieldPattern = /\{([^}]+)\}/g;
      const matches = [...formula.matchAll(fieldPattern)];
      
      for (const match of matches) {
        const fieldName = match[1];
        const field = allFields.find(f => f.name === fieldName);
        if (field) {
          const value = dynamicFields[fieldName] || '0';
          // Convert to number if it's a numeric field
          const numValue = (field.type === 'number' || field.type === 'integer' || field.type === 'decimal') 
            ? parseFloat(value) || 0 
            : value;
          expression = expression.replace(match[0], numValue);
        } else {
          expression = expression.replace(match[0], '0');
        }
      }
      
      // Evaluate the expression safely
      // Using Function constructor for safer evaluation
      const result = Function('"use strict"; return (' + expression + ')')();
      return isNaN(result) ? '' : result.toString();
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '';
    }
  };

  const handleDynamicFieldChange = (fieldName, value) => {
    setServiceFormData(prev => {
      const newDynamicFields = {
        ...prev.dynamicFields,
        [fieldName]: value
      };
      
      // Recalculate custom fields when any field changes
      const formSchema = selectedService?.formSchema || selectedService?.form_schema;
      if (selectedService && formSchema && formSchema.fields) {
        formSchema.fields.forEach(field => {
          if (field.type === 'custom' && field.config && field.config.formula) {
            newDynamicFields[field.name] = evaluateFormula(
              field.config.formula,
              newDynamicFields,
              formSchema.fields
            );
          }
        });
      }
      
      return {
        ...prev,
        dynamicFields: newDynamicFields,
        commands: prev.commands || []
      };
    });
    
    if (serviceErrors[fieldName]) {
      setServiceErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const handleServiceFormSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmittingService) return;
    
    const newErrors = {};
    if (!serviceFormData.serviceId) {
      newErrors.serviceId = 'Please select a service';
    }
    
    const formSchema = selectedService?.formSchema || selectedService?.form_schema;
    if (selectedService && formSchema && formSchema.fields) {
      formSchema.fields.forEach(field => {
        if (field.required && (!serviceFormData.dynamicFields[field.name] || serviceFormData.dynamicFields[field.name].toString().trim() === '')) {
          newErrors[field.name] = `${field.label || field.name} is required`;
        }
      });
    }
    
    if (Object.keys(newErrors).length > 0) {
      setServiceErrors(newErrors);
      return;
    }

    setIsSubmittingService(true);
    try {
      const token = getAuthToken();
      const isEdit = editingServiceRecord !== null;
      
      let url, method;
      if (isEdit) {
        url = `${API_ENDPOINTS.CUSTOMERS.BASE}/${id}/services/${serviceFormData.serviceId}/records/${editingServiceRecord.id}`;
        method = 'PUT';
      } else {
        url = API_ENDPOINTS.CUSTOMERS.ADD_SERVICE(id);
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: parseInt(serviceFormData.serviceId),
          ...serviceFormData.dynamicFields
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const recordId = isEdit ? editingServiceRecord.id : data.data?.id;
        if (recordId && serviceFormData.commands && serviceFormData.commands.length > 0) {
          const validCommands = serviceFormData.commands.filter(
            cmd => cmd.commandText && cmd.commandText.trim()
          );

          if (validCommands.length > 0) {
            try {
              const commandsResponse = await fetch(
                `${API_ENDPOINTS.CUSTOMERS.BASE}/${id}/services/${serviceFormData.serviceId}/records/${recordId}/commands`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    commands: validCommands
                  }),
                }
              );

              if (!commandsResponse.ok) {
                console.warn('Failed to add commands, but service was saved');
              }
            } catch (cmdError) {
              console.error('Error adding commands:', cmdError);
            }
          }
        }

        const pageToFetch = isEdit ? serviceCurrentPage : 1;
        if (!isEdit) {
          setServiceCurrentPage(1);
        }
        await fetchCustomerServices(pageToFetch);
        handleCloseAddServiceModal();
      } else {
        throw new Error(data.message || `Failed to ${isEdit ? 'update' : 'add'} service`);
      }
    } catch (error) {
      console.error(`Error ${editingServiceRecord ? 'updating' : 'adding'} service:`, error);
      alert(`Failed to ${editingServiceRecord ? 'update' : 'add'} service: ${error.message}`);
    } finally {
      setIsSubmittingService(false);
    }
  };

  const handleAddCommand = () => {
    setServiceFormData(prev => ({
      ...prev,
      commands: [...(prev.commands || []), { commandText: '' }]
    }));
  };

  const handleRemoveCommand = (index) => {
    setServiceFormData(prev => ({
      ...prev,
      commands: (prev.commands || []).filter((_, i) => i !== index)
    }));
  };

  const handleCommandChange = (index, field, value) => {
    setServiceFormData(prev => ({
      ...prev,
      commands: (prev.commands || []).map((cmd, i) => 
        i === index ? { ...cmd, [field]: value } : cmd
      )
    }));
  };

  const renderDynamicField = (field) => {
    const fieldName = field.name;
    const fieldValue = serviceFormData.dynamicFields[fieldName] || '';
    const hasError = serviceErrors[fieldName];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <input
              type={field.type}
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-input ${hasError ? 'error' : ''}`}
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <textarea
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-textarea ${hasError ? 'error' : ''}`}
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
              rows={field.rows || 4}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );
      case 'number':
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <input
              type="number"
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-input ${hasError ? 'error' : ''}`}
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
              min={field.min}
              max={field.max}
              step={field.step}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );
      case 'date':
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <input
              type="date"
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-input ${hasError ? 'error' : ''}`}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );
      case 'select':
        const options = field.options || field.config?.options || [];
        const hasCustomOption = options.some(opt => opt.value === '__custom__');
        const isCustomSelected = fieldValue === '__custom__' || (hasCustomOption && !options.some(opt => opt.value === fieldValue) && fieldValue);
        const showCustomInput = hasCustomOption && (isCustomSelected || fieldValue === '__custom__');
        
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <select
              id={fieldName}
              name={fieldName}
              value={showCustomInput ? '__custom__' : fieldValue}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  handleDynamicFieldChange(fieldName, '__custom__');
                } else {
                  handleDynamicFieldChange(fieldName, e.target.value);
                }
              }}
              className={`form-select ${hasError ? 'error' : ''}`}
            >
              <option value="">Select {field.label || fieldName}</option>
              {options.filter(opt => opt.value !== '__custom__').map(option => (
                <option key={option.value} value={option.value}>
                  {option.label || option.value}
                </option>
              ))}
              {hasCustomOption && (
                <option value="__custom__">Custom...</option>
              )}
            </select>
            {showCustomInput && (
              <input
                type="text"
                id={`${fieldName}_custom`}
                name={`${fieldName}_custom`}
                value={fieldValue === '__custom__' ? '' : fieldValue}
                onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
                className={`form-input ${hasError ? 'error' : ''}`}
                placeholder="Enter custom value"
                style={{ marginTop: '8px' }}
              />
            )}
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );
      case 'checkbox':
        return (
          <div key={fieldName} className="form-group">
            <label className="form-label-checkbox">
              <input
                type="checkbox"
                name={fieldName}
                checked={fieldValue === true || fieldValue === 'true'}
                onChange={(e) => handleDynamicFieldChange(fieldName, e.target.checked)}
              />
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );
      case 'custom':
        // Calculate value from formula
        const formSchema = selectedService?.formSchema || selectedService?.form_schema;
        const calculatedValue = selectedService && formSchema && formSchema.fields
          ? evaluateFormula(
              field.config?.formula || '',
              serviceFormData.dynamicFields,
              formSchema.fields
            )
          : '';
        
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {field.label || fieldName} <span style={{ fontSize: '12px', color: '#666' }}>(Calculated)</span>
            </label>
            <input
              type="text"
              id={fieldName}
              name={fieldName}
              value={calculatedValue}
              readOnly
              className="form-input"
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              placeholder="Auto-calculated value"
            />
            {field.config?.formula && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Formula: {field.config.formula}
              </div>
            )}
          </div>
        );
      default:
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <input
              type="text"
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-input ${hasError ? 'error' : ''}`}
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="customer-services-page">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={closeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
        <div className={`customer-services-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Header onMenuClick={toggleSidebar} />
          <div className="loading-container">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-services-page">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`customer-services-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="customer-services-content">
          {/* Breadcrumbs */}
          <div className="breadcrumbs">
            <span className="breadcrumb-item" onClick={() => navigate('/customers')}>Customers</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-item active">{customer?.name || 'Loading...'}</span>
          </div>

          {/* Customer Info Header */}
          <div className="customer-info-header">
            <div>
              <h1 className="page-title">{customer?.name || 'Loading...'}</h1>
              <p className="customer-email">{customer?.email || ''}</p>
            </div>
            <button className="btn-back" onClick={() => navigate(`/customers/${id}`)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Customer
            </button>
          </div>

          {/* Section Title */}
          <h2 className="section-title">Services</h2>

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
            <button className="btn-add-customer" onClick={handleAddService}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Add Service</span>
            </button>
          </div>

          {/* Services Table */}
          <ServicesTable
            services={services}
            isLoadingServices={isLoadingServices}
            searchQuery={searchQuery}
            servicePagination={servicePagination}
            serviceCurrentPage={serviceCurrentPage}
            serviceItemsPerPage={serviceItemsPerPage}
            onPageChange={setServiceCurrentPage}
            onViewCommands={handleViewCommands}
            onEdit={handleEditService}
            onDelete={handleDeleteService}
          />
        </div>
      </div>

      {/* Commands Modal */}
      {showCommandsModal && selectedServiceForCommands && (
        <div className="modal-overlay" onClick={() => setShowCommandsModal(false)}>
          <div className="modal-content commands-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Commands - {selectedServiceForCommands.serviceName}</h2>
              <button className="modal-close" onClick={() => setShowCommandsModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="commands-modal-body">
              {isLoadingCommands ? (
                <div className="commands-loading">Loading commands...</div>
              ) : serviceCommands.length === 0 ? (
                <div className="commands-empty-state">
                  <p>No commands found for this service.</p>
                </div>
              ) : (
                <div className="commands-list-view">
                  {serviceCommands.map((command, index) => (
                    <div key={index} className="command-item-view">
                      <div className="command-item-header">
                        <span className="command-date-badge">
                          {(() => {
                            const dateValue = command.commandedDate || command.commanded_date;
                            if (!dateValue) return 'Date not available';
                            try {
                              const date = new Date(dateValue);
                              if (isNaN(date.getTime())) return 'Date not available';
                              return date.toLocaleDateString('en-IN', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            } catch (e) {
                              return 'Date not available';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="command-item-content">
                        <p>{command.commandText || command.command_text || 'No command text'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="modal-overlay" onClick={handleCloseAddServiceModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Service to Customer</h2>
              <button className="modal-close" onClick={handleCloseAddServiceModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleServiceFormSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="serviceId" className="form-label">
                  Service <span className="required">*</span>
                </label>
                {isLoadingAvailableServices ? (
                  <div className="form-loading">Loading services...</div>
                ) : (
                  <select
                    id="serviceId"
                    name="serviceId"
                    value={serviceFormData.serviceId}
                    onChange={handleServiceFormChange}
                    className={`form-select ${serviceErrors.serviceId ? 'error' : ''}`}
                    disabled={editingServiceRecord !== null}
                  >
                    <option value="">Select a service</option>
                    {availableServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                )}
                {serviceErrors.serviceId && (
                  <span className="error-message">{serviceErrors.serviceId}</span>
                )}
              </div>

              {/* Dynamic Fields based on selected service */}
              {(() => {
                const formSchema = selectedService?.formSchema || selectedService?.form_schema;
                return selectedService && formSchema && formSchema.fields && formSchema.fields.length > 0 && (
                  <div className="dynamic-fields-section">
                    <h3 className="dynamic-fields-title">Service Details</h3>
                    {formSchema.fields.map(field => renderDynamicField(field))}
                  </div>
                );
              })()}

              {/* Commands Section */}
              <div className="commands-section">
                <div className="commands-header">
                  <h3 className="commands-title">Commands</h3>
                </div>
                <button 
                  type="button" 
                  className="btn-add-command" 
                  onClick={handleAddCommand}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 3.75V14.25M3.75 9H14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Add Command</span>
                </button>

                {(!serviceFormData.commands || serviceFormData.commands.length === 0) ? (
                  <div className="commands-empty">
                    <p>No commands added. Click "Add Command" to add one.</p>
                  </div>
                ) : (
                  <div className="commands-list">
                    {serviceFormData.commands.map((command, index) => (
                      <div key={index} className="command-item">
                        <div className="command-item-header">
                          <span className="command-number">Command {index + 1}</span>
                          <button
                            type="button"
                            className="btn-remove-command"
                            onClick={() => handleRemoveCommand(index)}
                            title="Remove command"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                        <div className="command-fields">
                          <div className="form-group">
                            <label htmlFor={`command-text-${index}`} className="form-label">
                              Command Text <span className="required">*</span>
                            </label>
                            <textarea
                              id={`command-text-${index}`}
                              value={command.commandText || ''}
                              onChange={(e) => handleCommandChange(index, 'commandText', e.target.value)}
                              className="form-textarea"
                              placeholder="Enter command text"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseAddServiceModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmittingService}>
                  {isSubmittingService ? 'Processing...' : (editingServiceRecord ? 'Update Service' : 'Add Service')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerServices;

