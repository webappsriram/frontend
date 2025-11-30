import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { hasRole, getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';


const Services = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const itemsPerPage = 10;

  // Commands modal state
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [selectedServiceForCommands, setSelectedServiceForCommands] = useState(null);
  const [serviceCommands, setServiceCommands] = useState([]);
  const [isLoadingCommands, setIsLoadingCommands] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingServiceRecord, setEditingServiceRecord] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    status: 'Yet to start',
    dynamicFields: {},
    commands: [] // Array of { commandText: '' } - commandedDate is set automatically from DB
  });
  const [serviceErrors, setServiceErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // Fetch services from API
  useEffect(() => {
    fetchServices(currentPage);
  }, [currentPage, searchQuery]);

  const fetchServices = async (page = 1) => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`${API_ENDPOINTS.SERVICES.RECORDS}?page=${page}&limit=${itemsPerPage}${searchParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setServices(data.data.serviceRecords || []);
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
        }
      } else {
        console.error('Failed to fetch service records');
      }
    } catch (error) {
      console.error('Error fetching service records:', error);
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

  // Services are already filtered by backend, no need for client-side filtering
  const filteredServices = services;

  const handleViewCommands = async (service) => {
    setSelectedServiceForCommands(service);
    setShowCommandsModal(true);
    setIsLoadingCommands(true);
    setServiceCommands([]);

    try {
      const token = getAuthToken();
      const commandsResponse = await fetch(
        API_ENDPOINTS.SERVICES.RECORD_COMMANDS(service.serviceId, service.id),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (commandsResponse.ok) {
        const commandsData = await commandsResponse.json();
        if (commandsData.success && commandsData.data && commandsData.data.commands) {
          setServiceCommands(commandsData.data.commands);
        }
      } else {
        console.error('Failed to fetch commands');
      }
    } catch (error) {
      console.error('Error fetching commands:', error);
    } finally {
      setIsLoadingCommands(false);
    }
  };

  const handleCloseCommandsModal = () => {
    setShowCommandsModal(false);
    setSelectedServiceForCommands(null);
    setServiceCommands([]);
  };

  const handleEditService = async (service) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        API_ENDPOINTS.SERVICES.RECORD_BY_ID(service.serviceId, service.id),
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
          const serviceRecord = data.data.serviceRecord;
          
          // Fetch available services to get form schema
          const servicesResponse = await fetch(API_ENDPOINTS.SERVICES.BASE, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            if (servicesData.success && servicesData.data && servicesData.data.services) {
              setAvailableServices(servicesData.data.services);
              const serviceDef = servicesData.data.services.find(s => s.id === serviceRecord.serviceId);
              setSelectedService(serviceDef);

              // Prepare form data
              const dynamicFields = {};
              if (serviceDef && serviceDef.formSchema && serviceDef.formSchema.fields) {
                serviceDef.formSchema.fields.forEach(field => {
                  let value = serviceRecord[field.name];
                  // Format date fields
                  if (field.type === 'date' && value) {
                    const dateValue = new Date(value);
                    if (!isNaN(dateValue.getTime())) {
                      const year = dateValue.getFullYear();
                      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
                      const day = String(dateValue.getDate()).padStart(2, '0');
                      value = `${year}-${month}-${day}`;
                    }
                  }
                  if (field.type !== 'custom') {
                    dynamicFields[field.name] = value || '';
                  }
                });
              }
              
              // Recalculate custom fields
              const fieldsWithCalculated = recalculateCustomFields(dynamicFields, serviceDef);

              setServiceFormData({
                status: serviceRecord.status || 'Yet to start',
                dynamicFields: fieldsWithCalculated,
                commands: [] // Don't show existing commands in edit mode
              });

              setEditingServiceRecord(serviceRecord);
              setServiceErrors({});
              setShowEditModal(true);
            }
          }
        }
      } else {
        alert('Failed to load service details');
      }
    } catch (error) {
      console.error('Error loading service for edit:', error);
      alert('Failed to load service details');
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

  // Helper function to recalculate custom fields
  const recalculateCustomFields = (dynamicFields, service) => {
    if (!service || !service.formSchema || !service.formSchema.fields) {
      return dynamicFields;
    }
    
    const newFields = { ...dynamicFields };
    service.formSchema.fields.forEach(field => {
      if (field.type === 'custom' && field.config && field.config.formula) {
        newFields[field.name] = evaluateFormula(
          field.config.formula,
          newFields,
          service.formSchema.fields
        );
      }
    });
    return newFields;
  };

  const handleDynamicFieldChange = (fieldName, value) => {
    setServiceFormData(prev => {
      const newDynamicFields = {
        ...prev.dynamicFields,
        [fieldName]: value
      };
      
      // Recalculate custom fields when any field changes
      if (selectedService && selectedService.formSchema && selectedService.formSchema.fields) {
        selectedService.formSchema.fields.forEach(field => {
          if (field.type === 'custom' && field.config && field.config.formula) {
            newDynamicFields[field.name] = evaluateFormula(
              field.config.formula,
              newDynamicFields,
              selectedService.formSchema.fields
            );
          }
        });
      }
      
      return {
        ...prev,
        dynamicFields: newDynamicFields
      };
    });
    
    if (serviceErrors[fieldName]) {
      setServiceErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const handleStatusChange = (e) => {
    setServiceFormData(prev => ({
      ...prev,
      status: e.target.value
    }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setServiceErrors({});

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        API_ENDPOINTS.SERVICES.UPDATE_RECORD(editingServiceRecord.serviceId, editingServiceRecord.id),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: serviceFormData.status,
            ...serviceFormData.dynamicFields
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Handle commands
        if (serviceFormData.commands && serviceFormData.commands.length > 0) {
          const validCommands = serviceFormData.commands.filter(
            cmd => cmd.commandText && cmd.commandText.trim()
          );

          if (validCommands.length > 0) {
            try {
              const commandsResponse = await fetch(
                API_ENDPOINTS.SERVICES.ADD_RECORD_COMMANDS(editingServiceRecord.serviceId, editingServiceRecord.id),
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
                console.warn('Failed to add commands, but service was updated');
              }
            } catch (cmdError) {
              console.error('Error adding commands:', cmdError);
            }
          }
        }

        handleCloseEditModal();
        fetchServices(currentPage);
      } else {
        setServiceErrors({ submit: data.message || 'Failed to update service record' });
      }
    } catch (error) {
      console.error('Error updating service record:', error);
      setServiceErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
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
    // Note: commandedDate is automatically set from service record's modified_on in the backend
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingServiceRecord(null);
    setServiceFormData({ status: 'Yet to start', dynamicFields: {}, commands: [] });
    setServiceErrors({});
    setSelectedService(null);
  };

  const renderDynamicField = (field) => {
    const fieldName = field.name;
    const fieldValue = serviceFormData.dynamicFields[fieldName] || '';
    const fieldLabel = field.label || fieldName;
    const hasError = serviceErrors[fieldName];

    switch (field.type) {
      case 'textarea':
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {fieldLabel} {field.required && <span className="required">*</span>}
            </label>
            <textarea
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-textarea ${hasError ? 'error' : ''}`}
              placeholder={`Enter ${fieldLabel.toLowerCase()}`}
              required={field.required}
              rows={4}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );

      case 'number':
      case 'integer':
      case 'decimal':
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {fieldLabel} {field.required && <span className="required">*</span>}
            </label>
            <input
              type="number"
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-input ${hasError ? 'error' : ''}`}
              placeholder={`Enter ${fieldLabel.toLowerCase()}`}
              required={field.required}
              step={field.type === 'decimal' ? '0.01' : field.type === 'integer' ? '1' : 'any'}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );

      case 'date':
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {fieldLabel} {field.required && <span className="required">*</span>}
            </label>
            <input
              type="date"
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-input ${hasError ? 'error' : ''}`}
              required={field.required}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );

      case 'email':
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {fieldLabel} {field.required && <span className="required">*</span>}
            </label>
            <input
              type="email"
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-input ${hasError ? 'error' : ''}`}
              placeholder={`Enter ${fieldLabel.toLowerCase()}`}
              required={field.required}
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
              {fieldLabel} {field.required && <span className="required">*</span>}
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
              className={`form-input ${hasError ? 'error' : ''}`}
              required={field.required}
            >
              <option value="">Select {fieldLabel}</option>
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

      case 'custom':
        // Calculate value from formula
        const calculatedValue = selectedService && selectedService.formSchema && selectedService.formSchema.fields
          ? evaluateFormula(
              field.config?.formula || '',
              serviceFormData.dynamicFields,
              selectedService.formSchema.fields
            )
          : '';
        
        return (
          <div key={fieldName} className="form-group">
            <label htmlFor={fieldName} className="form-label">
              {fieldLabel} <span style={{ fontSize: '12px', color: '#666' }}>(Calculated)</span>
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
              {fieldLabel} {field.required && <span className="required">*</span>}
            </label>
            <input
              type="text"
              id={fieldName}
              name={fieldName}
              value={fieldValue}
              onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
              className={`form-input ${hasError ? 'error' : ''}`}
              placeholder={`Enter ${fieldLabel.toLowerCase()}`}
              required={field.required}
            />
            {hasError && <span className="error-message">{hasError}</span>}
          </div>
        );
    }
  };

  const handleDeleteService = async (service) => {
    if (!window.confirm(`Are you sure you want to delete this service record for "${service.customerName}"?`)) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.SERVICES.DELETE_RECORD(service.serviceId, service.id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        fetchServices(currentPage);
      } else {
        alert(data.message || 'Failed to delete service record');
      }
    } catch (error) {
      console.error('Error deleting service record:', error);
      alert('Network error. Please try again.');
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-5">Services</h1>

            {/* Search and Add Button Bar */}
            <div className="customers-toolbar">
              <div className="search-box">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 19L14.65 14.65" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by customer name, email, phone, locality, city, state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Services Table */}
            <div className="services-table-card">
              <div className="services-table-container">
                <div className="services-table-header">
                  <div className="services-table-cell">Service ID</div>
                  <div className="services-table-cell">Service Name</div>
                  <div className="services-table-cell">Customer Name</div>
                  <div className="services-table-cell">Phone</div>
                  <div className="services-table-cell">Status</div>
                  <div className="services-table-cell">Date</div>
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
                      <div 
                        key={`${service.serviceId}-${service.id}`} 
                        className="services-table-row services-table-row-clickable"
                        onClick={() => handleViewCommands(service)}
                      >
                        <div className="services-table-cell" data-label="Service ID">
                          {service.serviceReferenceId || '-'}
                        </div>
                        <div className="services-table-cell" data-label="Service Name">{service.serviceName}</div>
                        <div className="services-table-cell" data-label="Customer Name">
                          {service.customerName || '-'}
                        </div>
                        <div className="services-table-cell" data-label="Phone">
                          {service.customerPhone || '-'}
                        </div>
                        <div className="services-table-cell" data-label="Status">
                          <span className={`status-badge status-${service.status?.toLowerCase().replace(/\s+/g, '-') || 'yet-to-start'}`}>
                            {service.status || 'Yet to start'}
                          </span>
                        </div>
                        <div className="services-table-cell" data-label="Date">
                          {service.createdOn 
                            ? new Date(service.createdOn).toLocaleDateString('en-IN', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                              })
                            : '-'}
                        </div>
                        <div className="services-table-cell" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                          <div className="action-buttons">
                            <button 
                              className="action-btn" 
                              title="Edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditService(service);
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            {hasRole('admin', 'master_user') && (
                              <button 
                                className="action-btn action-btn-delete" 
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteService(service);
                                }}
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
      </div>

      {/* Commands Modal */}
      {showCommandsModal && (
        <div className="modal-overlay" onClick={handleCloseCommandsModal}>
          <div className="modal-content commands-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Commands - {selectedServiceForCommands?.serviceName || 'Service'}
              </h2>
              <button className="modal-close" onClick={handleCloseCommandsModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body commands-modal-body">
              {isLoadingCommands ? (
                <div className="commands-loading">
                  <p>Loading commands...</p>
                </div>
              ) : serviceCommands.length === 0 ? (
                <div className="commands-empty-state">
                  <p>No commands found for this service.</p>
                </div>
              ) : (
                <div className="commands-list-view">
                  {serviceCommands.map((cmd, idx) => (
                    <div key={idx} className="command-item-view">
                      <div className="command-item-header">
                        <span className="command-date-badge">
                          {(() => {
                            const dateValue = cmd.commandedDate || cmd.commanded_date;
                            if (!dateValue) return 'Date not available';
                            try {
                              const date = new Date(dateValue);
                              if (isNaN(date.getTime())) return 'Date not available';
                              return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              });
                            } catch (e) {
                              return 'Date not available';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="command-text">
                        {cmd.commandText || cmd.command_text || 'No command text'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditModal && editingServiceRecord && selectedService && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Service - {editingServiceRecord.serviceName}</h2>
              <button className="modal-close" onClick={handleCloseEditModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="modal-form">
              {serviceErrors.submit && (
                <div className="form-error-message">
                  {serviceErrors.submit}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="status" className="form-label">
                  Status <span className="required">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={serviceFormData.status}
                  onChange={handleStatusChange}
                  className="form-input"
                  required
                >
                  <option value="Yet to start">Yet to start</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Will not do">Will not do</option>
                  <option value="Completed">Completed</option>
                  <option value="Lead">Lead</option>
                </select>
              </div>

              {selectedService.formSchema && selectedService.formSchema.fields && selectedService.formSchema.fields.length > 0 && (
                <>
                  <h3 className="form-section-title">Service Fields</h3>
                  {selectedService.formSchema.fields.map(field => renderDynamicField(field))}
                </>
              )}

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
                <button type="button" className="btn-cancel" onClick={handleCloseEditModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
