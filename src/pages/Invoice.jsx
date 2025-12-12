import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';


const Invoice = () => {
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
  // View invoice modal state
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isLoadingView, setIsLoadingView] = useState(false);

  // Inject modal styles when modal is shown
  useEffect(() => {
    if (showViewModal) {
      const styleId = 'invoice-view-modal-styles';
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
      
      const styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.innerHTML = `
        .invoice-view-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background-color: rgba(0, 0, 0, 0.6) !important;
          z-index: 99999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 20px !important;
          margin: 0 !important;
        }
        .invoice-view-modal-content {
          background-color: white !important;
          border-radius: 12px !important;
          max-width: 850px !important;
          width: 100% !important;
          max-height: 95vh !important;
          overflow: hidden !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
          display: flex !important;
          flex-direction: column !important;
          margin: 0 !important;
          position: relative !important;
        }
        .invoice-view-modal-content * {
          box-sizing: border-box !important;
        }
        .invoice-view-modal-content h1,
        .invoice-view-modal-content h2,
        .invoice-view-modal-content h3,
        .invoice-view-modal-content p,
        .invoice-view-modal-content div,
        .invoice-view-modal-content span {
          margin: 0 !important;
        }
        .invoice-view-modal-content table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        .invoice-view-modal-content th,
        .invoice-view-modal-content td {
          padding: 12px !important;
          text-align: left !important;
        }
      `;
      document.head.appendChild(styleTag);
      
      return () => {
        const styleToRemove = document.getElementById(styleId);
        if (styleToRemove) {
          styleToRemove.remove();
        }
      };
    }
  }, [showViewModal]);

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
  };

  const handleAddService = () => {
    if (availableServices.length === 0) {
      alert('No services available. Please create services first.');
      return;
    }
    const firstService = availableServices[0];
    const formSchema = firstService.formSchema || firstService.form_schema;
    const initialFormData = {};
    
    // Initialize form data for dynamic fields
    if (formSchema && formSchema.fields) {
      formSchema.fields.forEach(field => {
        if (field.type !== 'custom') {
          initialFormData[field.name] = field.defaultValue || '';
        }
      });
    }
    
    setInvoiceItems([...invoiceItems, {
      serviceId: firstService.id,
      serviceName: firstService.name,
      quantity: 1,
      unitPrice: firstService.baseAmount || firstService.base_amount || 0,
      formSchema: formSchema,
      formData: initialFormData
    }]);
  };

  const handleRemoveService = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
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
        const formSchema = service.formSchema || service.form_schema;
        updatedItems[index].formSchema = formSchema;
        const initialFormData = {};
        if (formSchema && formSchema.fields) {
          formSchema.fields.forEach(f => {
            if (f.type !== 'custom') {
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

  const renderDynamicField = (field, index, itemIndex) => {
    const fieldName = field.name;
    const fieldValue = invoiceItems[itemIndex]?.formData?.[fieldName] || '';
    
    if (field.type === 'custom') {
      return null; // Skip custom fields in invoice form
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div key={fieldName} className="invoice-form-field">
            <label className="invoice-form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <input
              type={field.type}
              value={fieldValue}
              onChange={(e) => handleFormFieldChange(itemIndex, fieldName, e.target.value)}
              className="invoice-form-input"
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName} className="invoice-form-field">
            <label className="invoice-form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <textarea
              value={fieldValue}
              onChange={(e) => handleFormFieldChange(itemIndex, fieldName, e.target.value)}
              className="invoice-form-textarea"
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
              rows={field.rows || 3}
            />
          </div>
        );
      case 'number':
      case 'integer':
      case 'decimal':
        return (
          <div key={fieldName} className="invoice-form-field">
            <label className="invoice-form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <input
              type="number"
              value={fieldValue}
              onChange={(e) => handleFormFieldChange(itemIndex, fieldName, e.target.value)}
              className="invoice-form-input"
              placeholder={field.placeholder || `Enter ${field.label || fieldName}`}
              step={field.type === 'integer' ? '1' : '0.01'}
            />
          </div>
        );
      case 'select':
        const options = field.options || field.config?.options || [];
        return (
          <div key={fieldName} className="invoice-form-field">
            <label className="invoice-form-label">
              {field.label || fieldName} {field.required && <span className="required">*</span>}
            </label>
            <select
              value={fieldValue}
              onChange={(e) => handleFormFieldChange(itemIndex, fieldName, e.target.value)}
              className="invoice-form-select"
            >
              <option value="">Select {field.label || fieldName}</option>
              {options.map((opt, optIndex) => (
                <option key={optIndex} value={typeof opt === 'string' ? opt : opt.value}>
                  {typeof opt === 'string' ? opt : opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((sum, item) => {
      return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0));
    }, 0);
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
          setLeadComments('');
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

  const handleCreateInvoice = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (invoiceItems.length === 0) {
      alert('Please add at least one service to the sale');
      return;
    }

    // Validate all items have quantity and unit price
    for (const item of invoiceItems) {
      if (!item.quantity || item.quantity <= 0) {
        alert('Please enter a valid quantity for all services');
        return;
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        alert('Please enter a valid unit price for all services');
        return;
      }
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
          setSelectedCustomer({
            id: invoice.customerId,
            name: invoice.customer.name,
            phone: invoice.customer.phone
          });
          setCustomerSearch(`${invoice.customer.name} - ${invoice.customer.phone}`);
          
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
    
    // Show modal immediately - this must happen first
    setShowViewModal(true);
    setIsLoadingView(true);
    setViewingInvoice(null);
    document.body.style.overflow = 'hidden';
    
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please login to view invoices');
        setShowViewModal(false);
        setIsLoadingView(false);
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
        // The API returns: { success: true, data: { invoice: {...} } }
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
          // Set the invoice data
          setViewingInvoice(invoice);
          setIsLoadingView(false);
        } else {
          alert('Failed to load invoice: Invoice data not found or invalid.');
          console.error('Invoice response:', data);
          setShowViewModal(false);
          setIsLoadingView(false);
          document.body.style.overflow = '';
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert('Failed to load invoice: ' + (errorData.message || 'Server error'));
        setShowViewModal(false);
        setIsLoadingView(false);
        document.body.style.overflow = '';
      }
    } catch (error) {
      alert('Failed to load invoice: ' + (error.message || 'Network error'));
      setShowViewModal(false);
      setIsLoadingView(false);
      document.body.style.overflow = '';
    }
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingInvoice(null);
    setIsLoadingView(false);
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
      let description = item.serviceName;
      
      // Add form data as additional information
      if (item.formData && Object.keys(item.formData).length > 0) {
        const formInfo = Object.entries(item.formData)
          .filter(([key, value]) => value && value.toString().trim())
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        if (formInfo) {
          description += ` (${formInfo})`;
        }
      }
      
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
            <h1>[Your Company Name]</h1>
            <p class="company-slogan">[Your Company Slogan]</p>
            <p>[Address]</p>
            <p>[Town, County Postal Code]</p>
            <p>Phone [01234 567890] Fax [01234 567890]</p>
          </div>
          <div class="invoice-title-section">
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-meta">
              <div class="invoice-meta-row">
                <span class="invoice-meta-label">INVOICE No</span>
                <span class="invoice-meta-value">[${invoice.invoiceNumber || `INV-${invoice.id}`}]</span>
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
              <p>[${invoice.customer?.name || 'Name'}]</p>
              <p>[${invoice.customer?.company || 'Company'}]</p>
              <p>[${customerAddress || 'Address'}]</p>
              <p>[${customerLocation || 'Town, County Postal Code'}]</p>
              <p>[${invoice.customer?.phone || 'Phone'}]</p>
            </div>
          </div>
          <div class="invoice-address-section">
            <div class="address-label">Delivery Address:</div>
            <div class="address-content">
              <p>[${invoice.customer?.name || 'Name'}]</p>
              <p>[${invoice.customer?.company || 'Company'}]</p>
              <p>[${customerAddress || 'Address'}]</p>
              <p>[${customerLocation || 'Town, County Postal Code'}]</p>
              <p>[${invoice.customer?.phone || 'Phone'}]</p>
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
          <p>Make all cheques payable to [Your Company Name]</p>
          <p>If you have any questions concerning this invoice, contact [Name, Phone Number, E-mail]</p>
          <p class="footer-thanks">THANK YOU FOR YOUR BUSINESS!</p>
        </div>
      </div>
    `;
  };

  const getInvoiceStyles = () => {
    return `
      #invoice-modal-content * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      #invoice-modal-content {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        color: #000;
        background: white;
        line-height: 1.4;
      }
      
      #invoice-modal-content .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
      }
      
      #invoice-modal-content .invoice-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 25px;
      }
      
      #invoice-modal-content .invoice-company {
        flex: 1;
      }
      
      #invoice-modal-content .invoice-company h1 {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 4px;
        color: #000;
      }
      
      #invoice-modal-content .company-slogan {
        font-size: 11px;
        color: #666;
        margin-bottom: 8px;
      }
      
      #invoice-modal-content .invoice-company p {
        font-size: 11px;
        color: #000;
        margin: 2px 0;
      }
      
      #invoice-modal-content .invoice-title-section {
        text-align: right;
        flex: 1;
      }
      
      #invoice-modal-content .invoice-title {
        font-size: 42px;
        font-weight: bold;
        color: #000;
        margin-bottom: 8px;
        letter-spacing: 2px;
      }
      
      #invoice-modal-content .invoice-meta {
        margin-top: 8px;
      }
      
      #invoice-modal-content .invoice-meta-row {
        margin-bottom: 4px;
        font-size: 11px;
      }
      
      #invoice-modal-content .invoice-meta-label {
        font-weight: normal;
        margin-right: 8px;
      }
      
      #invoice-modal-content .invoice-meta-value {
        font-weight: normal;
      }
      
      #invoice-modal-content .invoice-addresses {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        gap: 30px;
      }
      
      #invoice-modal-content .invoice-address-section {
        flex: 1;
      }
      
      #invoice-modal-content .address-label {
        font-weight: bold;
        font-size: 11px;
        margin-bottom: 6px;
        color: #000;
      }
      
      #invoice-modal-content .address-content {
        font-size: 11px;
        color: #000;
      }
      
      #invoice-modal-content .address-content p {
        margin: 2px 0;
      }
      
      #invoice-modal-content .invoice-instructions {
        margin-bottom: 15px;
        font-size: 11px;
        color: #000;
      }
      
      #invoice-modal-content .invoice-info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 10px;
      }
      
      #invoice-modal-content .invoice-info-table tr:first-child {
        border-bottom: 1px solid #ddd;
      }
      
      #invoice-modal-content .invoice-info-table td {
        padding: 6px 4px;
        text-align: left;
      }
      
      #invoice-modal-content .info-label {
        font-weight: bold;
        font-size: 9px;
        color: #000;
      }
      
      #invoice-modal-content .info-value {
        font-size: 10px;
        color: #000;
      }
      
      #invoice-modal-content .invoice-items {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        border: 1px solid #000;
      }
      
      #invoice-modal-content .invoice-items thead {
        background: #f0f0f0;
      }
      
      #invoice-modal-content .invoice-items th {
        padding: 8px 6px;
        text-align: left;
        font-weight: bold;
        font-size: 10px;
        border: 1px solid #000;
        border-bottom: 2px solid #000;
      }
      
      #invoice-modal-content .invoice-items th:last-child,
      #invoice-modal-content .invoice-items th:nth-child(3),
      #invoice-modal-content .invoice-items th:nth-child(4) {
        text-align: right;
      }
      
      #invoice-modal-content .invoice-items td {
        padding: 6px;
        border: 1px solid #ddd;
        font-size: 11px;
        border-right: 1px solid #000;
      }
      
      #invoice-modal-content .invoice-items tbody tr:last-child td {
        border-bottom: 1px solid #000;
      }
      
      #invoice-modal-content .invoice-items td:last-child,
      #invoice-modal-content .invoice-items td:nth-child(3),
      #invoice-modal-content .invoice-items td:nth-child(4) {
        text-align: right;
      }
      
      #invoice-modal-content .invoice-summary {
        width: 100%;
        max-width: 300px;
        margin-left: auto;
        margin-bottom: 30px;
      }
      
      #invoice-modal-content .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 8px;
        font-size: 11px;
        border-bottom: 1px solid #ddd;
      }
      
      #invoice-modal-content .summary-row.total-row {
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        font-weight: bold;
        font-size: 12px;
        padding: 8px;
        margin-top: 4px;
      }
      
      #invoice-modal-content .summary-label {
        font-weight: bold;
        color: #000;
      }
      
      #invoice-modal-content .summary-value {
        color: #000;
        text-align: right;
      }
      
      #invoice-modal-content .invoice-footer {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        font-size: 10px;
        color: #000;
      }
      
      #invoice-modal-content .invoice-footer p {
        margin: 4px 0;
      }
      
      #invoice-modal-content .footer-thanks {
        font-weight: bold;
        font-size: 11px;
        margin-top: 10px;
        letter-spacing: 1px;
      }
      
      @media print {
        #invoice-modal-content {
          padding: 10px;
        }
        
        #invoice-modal-content .invoice-container {
          max-width: 100%;
        }
        
        @page {
          margin: 0.5cm;
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
    <div className="invoice-page">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`invoice-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="invoice-content">
          <div className="invoice-container">
            <div className="invoice-header">
              <h1 className="page-title">Sales</h1>
              {viewMode === 'list' && (
                <button 
                  className="btn-primary"
                  onClick={() => setViewMode('create')}
                >
                  + Create Sale
                </button>
              )}
              {viewMode === 'create' && (
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setViewMode('list');
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                    setInvoiceItems([]);
                    setInvoiceStatus('draft');
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
                <div className="customers-toolbar">
                  <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 19L14.65 14.65" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by sale number, customer name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>

                {/* Invoices Table */}
                <div className="services-table-card">
                  <div className="services-table-container">
                    <div className="services-table-header">
                      <div className="services-table-cell">Invoice Number</div>
                      <div className="services-table-cell">Customer</div>
                      <div className="services-table-cell">Date</div>
                      <div className="services-table-cell">Amount</div>
                      <div className="services-table-cell">Status</div>
                      <div className="services-table-cell">Actions</div>
                    </div>
                    <div className="services-table-body">
                      {isLoading ? (
                        <div className="services-table-empty">
                          <p>Loading sales...</p>
                        </div>
                      ) : invoices.length === 0 ? (
                        <div className="services-table-empty">
                          <p>No sales found</p>
                        </div>
                      ) : (
                        invoices.map((invoice) => (
                          <div key={invoice.id} className="services-table-row">
                            <div className="services-table-cell" data-label="Invoice Number">
                              {invoice.invoiceNumber || `INV-${invoice.id}`}
                            </div>
                            <div className="services-table-cell" data-label="Customer">
                              {invoice.customerName || '-'}
                            </div>
                            <div className="services-table-cell" data-label="Date">
                              {invoice.createdOn 
                                ? new Date(invoice.createdOn).toLocaleDateString('en-IN', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })
                                : '-'}
                            </div>
                            <div className="services-table-cell" data-label="Amount">
                              {invoice.totalAmount ? `₹${parseFloat(invoice.totalAmount).toLocaleString('en-IN')}` : '-'}
                            </div>
                            <div className="services-table-cell" data-label="Status">
                              <span className={`status-badge status-${invoice.status?.toLowerCase().replace(/\s+/g, '-') || 'pending'}`}>
                                {invoice.status || 'Pending'}
                              </span>
                            </div>
                            <div className="services-table-cell" data-label="Actions">
                              <div className="action-buttons">
                                <button 
                                  className="action-btn" 
                                  title="View"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (invoice && invoice.id) {
                                      handleViewInvoice(invoice.id);
                                    } else {
                                      alert('Invalid invoice data');
                                    }
                                  }}
                                  type="button"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 2C4.5 2 1.73 4.11 1 7C1.73 9.89 4.5 12 8 12C11.5 12 14.27 9.89 15 7C14.27 4.11 11.5 2 8 2ZM8 10.5C6.07 10.5 4.5 8.93 4.5 7C4.5 5.07 6.07 3.5 8 3.5C9.93 3.5 11.5 5.07 11.5 7C11.5 8.93 9.93 10.5 8 10.5ZM8 5C7.17 5 6.5 5.67 6.5 6.5C6.5 7.33 7.17 8 8 8C8.83 8 9.5 7.33 9.5 6.5C9.5 5.67 8.83 5 8 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                                <button 
                                  className="action-btn" 
                                  title="Edit"
                                  onClick={() => handleEditInvoice(invoice.id)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                                <button 
                                  className="action-btn" 
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
              </>
            ) : (
              <div className="invoice-create-card">
                <h2 className="invoice-create-title">{editingInvoiceId ? 'Edit Sale' : 'Create New Sale'}</h2>
                
                {/* Customer Selection */}
                <div className="invoice-section">
                  <label className="invoice-label">Select Customer *</label>
                  <div className="customer-search-wrapper">
                    <input
                      type="text"
                      placeholder="Search by customer name or phone..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        if (!e.target.value) {
                          setSelectedCustomer(null);
                        }
                      }}
                      className="customer-search-input"
                    />
                    {customerResults.length > 0 && (
                      <div className="customer-results">
                        {customerResults.map((customer) => (
                          <div
                            key={customer.id}
                            className="customer-result-item"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="customer-result-name">{customer.name}</div>
                            <div className="customer-result-phone">{customer.phone}</div>
                            {customer.city && (
                              <div className="customer-result-location">{customer.city}, {customer.state}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {customerSearch.trim().length > 0 && customerResults.length === 0 && !selectedCustomer && (
                      <div className="customer-results">
                        <div className="customer-not-found">
                          <div className="customer-not-found-message">
                            No customer found matching "{customerSearch}"
                          </div>
                          <button
                            className="btn-add-customer-from-search"
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
                      <div className="selected-customer">
                        <div className="selected-customer-info">
                          <strong>{selectedCustomer.name}</strong>
                          <span>{selectedCustomer.phone}</span>
                        </div>
                        <div className="selected-customer-actions">
                          <button
                            className="btn-mark-lead"
                            onClick={() => setShowLeadModal(true)}
                            title="Mark as Lead"
                          >
                            Mark as Lead
                          </button>
                          <button
                            className="btn-remove-customer"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerSearch('');
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Services Section */}
                <div className="invoice-section">
                  <div className="invoice-section-header">
                    <label className="invoice-label">Services *</label>
                    <button className="btn-add-service" onClick={handleAddService}>
                      + Add Service
                    </button>
                  </div>
                  
                  {invoiceItems.length === 0 ? (
                    <div className="invoice-empty-state">
                      <p>No services added. Click "Add Service" to add services to this invoice.</p>
                    </div>
                  ) : (
                    <div className="invoice-items-table">
                      <div className="invoice-items-header">
                        <div className="invoice-item-cell">Service</div>
                        <div className="invoice-item-cell">Quantity</div>
                        <div className="invoice-item-cell">Unit Price (₹)</div>
                        <div className="invoice-item-cell">Total (₹)</div>
                        <div className="invoice-item-cell">Action</div>
                      </div>
                      {invoiceItems.map((item, index) => {
                        const formSchema = item.formSchema || (availableServices.find(s => s.id === item.serviceId)?.formSchema || availableServices.find(s => s.id === item.serviceId)?.form_schema);
                        const hasFormFields = formSchema && formSchema.fields && formSchema.fields.length > 0;
                        
                        return (
                          <div key={index} className="invoice-service-item-wrapper">
                            <div className="invoice-service-item-header">
                              <span className="invoice-service-name">{item.serviceName || 'Select Service'}</span>
                            </div>
                            <div className="invoice-item-row">
                              <div className="invoice-item-cell">
                                <select
                                  value={item.serviceId}
                                  onChange={(e) => handleServiceChange(index, 'serviceId', e.target.value)}
                                  className="invoice-select"
                                >
                                  {availableServices.map((service) => (
                                    <option key={service.id} value={service.id}>
                                      {service.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="invoice-item-cell">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => handleServiceChange(index, 'quantity', e.target.value)}
                                  className="invoice-input"
                                />
                              </div>
                              <div className="invoice-item-cell">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => handleServiceChange(index, 'unitPrice', e.target.value)}
                                  className="invoice-input"
                                />
                              </div>
                              <div className="invoice-item-cell">
                                <strong>₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}</strong>
                              </div>
                              <div className="invoice-item-cell">
                                <button
                                  className="btn-remove-item"
                                  onClick={() => handleRemoveService(index)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            {hasFormFields && (
                              <div className="invoice-item-form-section">
                                <div className="invoice-item-form-header">
                                  <span className="invoice-item-form-title">Information</span>
                                </div>
                                <div className="invoice-item-form-fields">
                                  {formSchema.fields.map((field, fieldIndex) => renderDynamicField(field, fieldIndex, index))}
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
                <div className="invoice-total-section">
                  <div className="invoice-total-row">
                    <span className="invoice-total-label">Total Amount:</span>
                    <span className="invoice-total-value">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="invoice-status-row">
                    <label className="invoice-label">Status:</label>
                    <select
                      value={invoiceStatus}
                      onChange={(e) => {
                        setInvoiceStatus(e.target.value);
                        if (e.target.value !== 'paid') {
                          setPaymentMethod('');
                          setPaymentReferenceId('');
                        }
                      }}
                      className="invoice-status-select"
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
                  <div className="invoice-section payment-method-section">
                    <label className="invoice-label">Payment Method <span className="required">*</span></label>
                    <div className="payment-method-options">
                      <label className="payment-method-option">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Cash"
                          checked={paymentMethod === 'Cash'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setPaymentReferenceId('');
                          }}
                        />
                        <span>Cash</span>
                      </label>
                      <label className="payment-method-option">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Bank Transfer"
                          checked={paymentMethod === 'Bank Transfer'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setPaymentReferenceId('');
                          }}
                        />
                        <span>Bank Transfer</span>
                      </label>
                      <label className="payment-method-option">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="UPI"
                          checked={paymentMethod === 'UPI'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setPaymentReferenceId('');
                          }}
                        />
                        <span>UPI</span>
                      </label>
                      <label className="payment-method-option">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Other"
                          checked={paymentMethod === 'Other'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setPaymentReferenceId('');
                          }}
                        />
                        <span>Other</span>
                      </label>
                    </div>

                    {/* Payment Reference ID - Only show for Bank Transfer or UPI */}
                    {(paymentMethod === 'Bank Transfer' || paymentMethod === 'UPI') && (
                      <div className="invoice-form-field" style={{ marginTop: '16px' }}>
                        <label className="invoice-form-label">
                          Reference ID
                        </label>
                        <input
                          type="text"
                          value={paymentReferenceId}
                          onChange={(e) => setPaymentReferenceId(e.target.value)}
                          className="invoice-form-input"
                          placeholder={`Enter ${paymentMethod === 'Bank Transfer' ? 'transaction' : 'UPI'} reference ID`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Create Button */}
                <div className="invoice-actions">
                  <button
                    className="btn-create-invoice"
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
        <div className="modal-overlay" onClick={() => !isCreatingLead && setShowLeadModal(false)}>
          <div className="modal-content lead-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Mark as Lead</h2>
              <button 
                className="modal-close" 
                onClick={() => !isCreatingLead && setShowLeadModal(false)}
                disabled={isCreatingLead}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="leadComments" className="invoice-label">
                  Comments <span className="required">*</span>
                </label>
                <textarea
                  id="leadComments"
                  value={leadComments}
                  onChange={(e) => setLeadComments(e.target.value)}
                  className="invoice-form-textarea"
                  placeholder="Enter comments about this lead..."
                  rows="5"
                  disabled={isCreatingLead}
                />
                <small className="form-hint">Please provide comments about why this customer is being marked as a lead.</small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowLeadModal(false);
                  setLeadComments('');
                }}
                disabled={isCreatingLead}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleMarkAsLead}
                disabled={isCreatingLead || !leadComments.trim()}
              >
                {isCreatingLead ? 'Marking...' : 'Mark as Lead'}
              </button>
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

      {/* View Invoice Modal - New Implementation */}
      {showViewModal && (
        <div 
          className="invoice-view-modal-overlay" 
          onClick={closeViewModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-modal-title"
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
            className="invoice-view-modal-content" 
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
            {/* Modal Header */}
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid #e5e7eb', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#f9fafb',
              margin: 0
            }}>
              <h2 id="invoice-modal-title" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                {isLoadingView ? 'Loading...' : viewingInvoice && viewingInvoice.id ? `Invoice ${viewingInvoice.invoiceNumber || viewingInvoice.invoice_number || `INV-${viewingInvoice.id}`}` : 'Invoice Details'}
              </h2>
              <button 
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
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ 
              padding: '24px', 
              overflow: 'auto',
              flex: 1,
              backgroundColor: 'white',
              margin: 0
            }}>
              {isLoadingView ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading invoice details...</div>
                </div>
              ) : viewingInvoice && viewingInvoice.id ? (
                <div style={{ fontFamily: 'Arial, sans-serif', color: '#111827', margin: 0 }}>
                  {/* Invoice Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
                    <div style={{ margin: 0 }}>
                      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#111827', margin: '0 0 8px 0' }}>INVOICE</h1>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        <div style={{ margin: 0 }}>
                          <strong>Invoice #:</strong> {viewingInvoice.invoiceNumber || viewingInvoice.invoice_number || `INV-${viewingInvoice.id}`}
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <strong>Date:</strong> {
                            viewingInvoice.createdOn 
                              ? new Date(viewingInvoice.createdOn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                              : viewingInvoice.created_on
                                ? new Date(viewingInvoice.created_on).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Status</div>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: (viewingInvoice.status === 'paid' || viewingInvoice.status === 'Paid') ? '#d1fae5' : (viewingInvoice.status === 'pending' || viewingInvoice.status === 'Pending') ? '#fef3c7' : '#fee2e2',
                        color: (viewingInvoice.status === 'paid' || viewingInvoice.status === 'Paid') ? '#065f46' : (viewingInvoice.status === 'pending' || viewingInvoice.status === 'Pending') ? '#92400e' : '#991b1b',
                        display: 'inline-block'
                      }}>
                        {(viewingInvoice.status || 'DRAFT').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {viewingInvoice.customer && (
                    <div style={{ marginBottom: '30px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827', margin: '0 0 12px 0' }}>Bill To:</h3>
                      <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                        <div style={{ fontWeight: '600', margin: 0 }}>{viewingInvoice.customer.name || 'N/A'}</div>
                        {viewingInvoice.customer.company && <div style={{ margin: 0 }}>{viewingInvoice.customer.company}</div>}
                        {viewingInvoice.customer.address && <div style={{ margin: 0 }}>{viewingInvoice.customer.address}</div>}
                        <div style={{ margin: 0 }}>
                          {[viewingInvoice.customer.city, viewingInvoice.customer.state, viewingInvoice.customer.zipCode]
                            .filter(Boolean).join(', ')}
                        </div>
                        {viewingInvoice.customer.phone && <div style={{ margin: 0 }}>Phone: {viewingInvoice.customer.phone}</div>}
                      </div>
                    </div>
                  )}

                  {/* Items Table */}
                  {viewingInvoice.items && viewingInvoice.items.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827', margin: '0 0 12px 0' }}>Items</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', margin: 0 }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#374151', margin: 0 }}>Description</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#374151', margin: 0 }}>Qty</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#374151', margin: 0 }}>Unit Price</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#374151', margin: 0 }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingInvoice.items.map((item, index) => {
                            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                            let description = item.serviceName || 'N/A';
                            if (item.formData && Object.keys(item.formData).length > 0) {
                              const formInfo = Object.entries(item.formData)
                                .filter(([key, value]) => value && value.toString().trim())
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ');
                              if (formInfo) {
                                description += ` (${formInfo})`;
                              }
                            }
                            return (
                              <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px', fontSize: '14px', color: '#374151', margin: 0 }}>{description}</td>
                                <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#374151', margin: 0 }}>{item.quantity || '0'}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#374151', margin: 0 }}>₹{parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>₹{itemTotal.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary */}
                  <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e5e7eb' }}>
                    <div style={{ maxWidth: '300px', marginLeft: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#6b7280' }}>
                        <span style={{ margin: 0 }}>Subtotal:</span>
                        <span style={{ fontWeight: '500', color: '#111827', margin: 0 }}>
                          ₹{viewingInvoice.items ? viewingInvoice.items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#6b7280' }}>
                        <span style={{ margin: 0 }}>Tax:</span>
                        <span style={{ fontWeight: '500', color: '#111827', margin: 0 }}>₹0.00</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: '8px', borderTop: '2px solid #111827', fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                        <span style={{ margin: 0 }}>Total:</span>
                        <span style={{ margin: 0 }}>₹{parseFloat(viewingInvoice.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  {viewingInvoice.status === 'paid' && viewingInvoice.paymentMethod && (
                    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#d1fae5', borderRadius: '8px', fontSize: '14px' }}>
                      <strong>Payment Method:</strong> {viewingInvoice.paymentMethod}
                      {viewingInvoice.paymentReferenceId && (
                        <div style={{ marginTop: '4px' }}>
                          <strong>Reference ID:</strong> {viewingInvoice.paymentReferenceId}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', color: '#6b7280', marginBottom: '10px' }}>No invoice data available</div>
                  {viewingInvoice && (
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Debug: viewingInvoice exists but missing id. Data: {JSON.stringify(Object.keys(viewingInvoice || {}))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ 
              padding: '20px 24px', 
              borderTop: '1px solid #e5e7eb', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px',
              backgroundColor: '#f9fafb',
              margin: 0
            }}>
              <button
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