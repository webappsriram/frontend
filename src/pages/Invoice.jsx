import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { getAuthToken } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';
import './Invoice.css';

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
    try {
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
          setViewingInvoice(data.data.invoice);
          setShowInvoiceModal(true);
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
          month: 'short', 
          day: 'numeric' 
        })
      : new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });

    let itemsHTML = '';
    invoice.items.forEach((item, index) => {
      const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
      let description = `${item.serviceName} (Qty: ${item.quantity} × ₹${parseFloat(item.unitPrice).toFixed(2)})`;
      
      // Add form data as additional information
      if (item.formData && Object.keys(item.formData).length > 0) {
        const formInfo = Object.entries(item.formData)
          .filter(([key, value]) => value && value.toString().trim())
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        if (formInfo) {
          description += `<br><small style="color: #666; margin-left: 20px;">${formInfo}</small>`;
        }
      }
      
      itemsHTML += `
        <tr>
          <td>${description}</td>
          <td style="text-align: right;">₹${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    return `
      <div class="invoice-container">
        <div class="invoice-header">
          <div class="invoice-company">
            <h1>SriRam E-sevaiMiyam</h1>
            <p>[Street Address]</p>
            <p>[City, ST ZIP]</p>
            <p>Phone: [Phone Number]</p>
          </div>
          <div class="invoice-title-section">
            <h1 class="invoice-title">INVOICE</h1>
            <table class="invoice-meta">
              <tr>
                <td><strong>INVOICE#</strong></td>
                <td>${invoice.invoiceNumber || `INV-${invoice.id}`}</td>
              </tr>
              <tr>
                <td><strong>DATE</strong></td>
                <td>${invoiceDate}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="invoice-bill-to">
          <div class="bill-to-header">BILL TO</div>
          <div class="bill-to-content">
            <p><strong>${invoice.customer?.name || 'N/A'}</strong></p>
            ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
            <p>${invoice.customer?.city || ''}${invoice.customer?.city && invoice.customer?.state ? ', ' : ''}${invoice.customer?.state || ''} ${invoice.customer?.zipCode || ''}</p>
            <p>${invoice.customer?.phone || 'N/A'}</p>
            ${invoice.customer?.email ? `<p>${invoice.customer.email}</p>` : ''}
          </div>
        </div>
        
        <table class="invoice-items">
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th style="text-align: right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div class="invoice-footer">
          <div class="invoice-thanks">Thank you for your business!</div>
          <div class="invoice-total-section">
            <div class="invoice-total-label">TOTAL</div>
            <div class="invoice-total-amount">₹${parseFloat(invoice.totalAmount).toFixed(2)}</div>
          </div>
        </div>
        
        ${invoice.status === 'paid' && invoice.paymentMethod ? `
        <div class="invoice-payment-info">
          <div class="invoice-payment-label">Payment Method:</div>
          <div class="invoice-payment-value">${invoice.paymentMethod}${invoice.paymentReferenceId ? ` (Ref: ${invoice.paymentReferenceId})` : ''}</div>
        </div>
        ` : ''}
        
        <div class="invoice-contact">
          <p>If you have any questions about this invoice, please contact</p>
          <p>[Name, Phone, email@address.com]</p>
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
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #333;
        padding: 20px;
        background: white;
      }
      
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
      }
      
      .invoice-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
      }
      
      .invoice-company h1 {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #333;
      }
      
      .invoice-company p {
        font-size: 11px;
        color: #666;
        margin: 2px 0;
      }
      
      .invoice-title-section {
        text-align: right;
      }
      
      .invoice-title {
        font-size: 48px;
        font-weight: bold;
        color: #999;
        margin-bottom: 10px;
      }
      
      .invoice-meta {
        border-collapse: collapse;
        margin-top: 10px;
      }
      
      .invoice-meta td {
        padding: 4px 8px;
        font-size: 11px;
      }
      
      .invoice-meta td:first-child {
        text-align: right;
        padding-right: 15px;
      }
      
      .invoice-bill-to {
        margin-bottom: 30px;
      }
      
      .bill-to-header {
        background: #666;
        color: white;
        padding: 8px 12px;
        font-weight: bold;
        font-size: 11px;
        margin-bottom: 10px;
      }
      
      .bill-to-content {
        padding-left: 12px;
      }
      
      .bill-to-content p {
        font-size: 11px;
        margin: 3px 0;
        color: #333;
      }
      
      .invoice-items {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      
      .invoice-items thead {
        background: #666;
        color: white;
      }
      
      .invoice-items th {
        padding: 10px 12px;
        text-align: left;
        font-weight: bold;
        font-size: 11px;
      }
      
      .invoice-items th:last-child {
        text-align: right;
      }
      
      .invoice-items td {
        padding: 10px 12px;
        border-bottom: 1px solid #ddd;
        font-size: 11px;
      }
      
      .invoice-items td:last-child {
        text-align: right;
      }
      
      .invoice-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-top: 30px;
        margin-bottom: 40px;
      }
      
      .invoice-thanks {
        font-size: 12px;
        color: #333;
      }
      
      .invoice-total-section {
        text-align: right;
      }
      
      .invoice-total-label {
        background: #666;
        color: white;
        padding: 8px 12px;
        font-weight: bold;
        font-size: 11px;
        margin-bottom: 5px;
      }
      
      .invoice-total-amount {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        padding: 5px 12px;
      }
      
      .invoice-payment-info {
        margin-top: 20px;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 4px;
        font-size: 11px;
      }
      
      .invoice-payment-label {
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
      }
      
      .invoice-payment-value {
        color: #666;
      }
      
      .invoice-contact {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        font-size: 10px;
        color: #666;
      }
      
      .invoice-contact p {
        margin: 3px 0;
      }
      
      @media print {
        body {
          padding: 0;
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
                                  onClick={() => handleViewInvoice(invoice.id)}
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

      {/* View Invoice Modal */}
      {showInvoiceModal && viewingInvoice && (
        <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="modal-content invoice-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Invoice {viewingInvoice.invoiceNumber || `INV-${viewingInvoice.id}`}</h3>
              <button className="modal-close" onClick={() => setShowInvoiceModal(false)}>×</button>
            </div>
            <div className="modal-body invoice-view-body">
              <div className="invoice-view-container">
                <div className="invoice-view-header">
                  <div className="invoice-view-company">
                    <h2>SriRam E-sevaiMiyam</h2>
                    <p>[Street Address]</p>
                    <p>[City, ST ZIP]</p>
                    <p>Phone: [Phone Number]</p>
                  </div>
                  <div className="invoice-view-title-section">
                    <h1 className="invoice-view-title">INVOICE</h1>
                    <table className="invoice-view-meta">
                      <tr>
                        <td><strong>INVOICE#</strong></td>
                        <td>{viewingInvoice.invoiceNumber || `INV-${viewingInvoice.id}`}</td>
                      </tr>
                      <tr>
                        <td><strong>DATE</strong></td>
                        <td>
                          {viewingInvoice.createdOn 
                            ? new Date(viewingInvoice.createdOn).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })
                            : new Date().toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                        </td>
                      </tr>
                    </table>
                  </div>
                </div>
                
                <div className="invoice-view-bill-to">
                  <div className="invoice-view-bill-to-header">BILL TO</div>
                  <div className="invoice-view-bill-to-content">
                    <p><strong>{viewingInvoice.customer.name}</strong></p>
                    {viewingInvoice.customer.address && <p>{viewingInvoice.customer.address}</p>}
                    <p>{viewingInvoice.customer.city}, {viewingInvoice.customer.state} {viewingInvoice.customer.zipCode}</p>
                    <p>{viewingInvoice.customer.phone}</p>
                    {viewingInvoice.customer.email && <p>{viewingInvoice.customer.email}</p>}
                  </div>
                </div>
                
                <table className="invoice-view-items">
                  <thead>
                    <tr>
                      <th>DESCRIPTION</th>
                      <th style={{textAlign: 'right'}}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.items.map((item, index) => {
                      const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                      return (
                        <tr key={index}>
                          <td>
                            <div>{item.serviceName} (Qty: {item.quantity} × ₹{parseFloat(item.unitPrice).toFixed(2)})</div>
                            {item.formData && Object.keys(item.formData).length > 0 && (
                              <div style={{marginTop: '8px', fontSize: '12px', color: '#666', marginLeft: '20px'}}>
                                {Object.entries(item.formData)
                                  .filter(([key, value]) => value && value.toString().trim())
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(', ')}
                              </div>
                            )}
                          </td>
                          <td style={{textAlign: 'right'}}>₹{itemTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                <div className="invoice-view-footer">
                  <div className="invoice-view-thanks">Thank you for your business!</div>
                  <div className="invoice-view-total-section">
                    <div className="invoice-view-total-label">TOTAL</div>
                    <div className="invoice-view-total-amount">₹{parseFloat(viewingInvoice.totalAmount).toFixed(2)}</div>
                  </div>
                </div>
                
                {viewingInvoice.status === 'paid' && viewingInvoice.paymentMethod && (
                  <div className="invoice-view-payment-info">
                    <div className="invoice-view-payment-label">Payment Method:</div>
                    <div className="invoice-view-payment-value">
                      {viewingInvoice.paymentMethod}
                      {viewingInvoice.paymentReferenceId && ` (Ref: ${viewingInvoice.paymentReferenceId})`}
                    </div>
                  </div>
                )}
                
                <div className="invoice-view-contact">
                  <p>If you have any questions about this invoice, please contact</p>
                  <p>[Name, Phone, email@address.com]</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowInvoiceModal(false)}
              >
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowInvoiceModal(false);
                  handleDownloadInvoice(viewingInvoice.id);
                }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
