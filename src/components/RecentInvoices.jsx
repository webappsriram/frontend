import React, { useState, useEffect } from 'react';
import { apiRequestJson, API_ENDPOINTS } from '../utils/api';
import dayjs from 'dayjs';

const RecentInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentInvoices = async () => {
      try {
        setIsLoading(true);
        const url = `${API_ENDPOINTS.SALES.BASE}?page=1&limit=5`;
        const response = await apiRequestJson(url);
        if (response.success) {
          setInvoices(response.data.invoices || []);
        }
      } catch (error) {
        console.error('Failed to fetch recent invoices:', error);
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentInvoices();
  }, []);

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₹0.00';
    }
    const numValue = parseFloat(value) || 0;
    return `₹${numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD MMM, YYYY');
  };

  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'paid') {
      return 'bg-green-100 text-green-800';
    } else if (statusLower === 'pending') {
      return 'bg-yellow-100 text-yellow-800';
    } else if (statusLower === 'cancelled') {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-800">Recent Sales</h3>
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-6 gap-4 pb-3 border-b-2 border-gray-100 mb-3 min-w-full">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">No</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Created</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Client</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Created By</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</div>
        </div>
        <div className="flex flex-col gap-0">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No sales found</div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="grid grid-cols-6 gap-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                <div className="text-sm text-gray-800">{invoice.invoiceNumber || `INV-${invoice.id}`}</div>
                <div className="text-sm text-gray-800">{formatDate(invoice.createdOn)}</div>
                <div className="text-sm text-gray-800">{invoice.customerName || '-'}</div>
                <div className="text-sm text-gray-800">{formatCurrency(invoice.totalAmount)}</div>
                <div className="text-sm text-gray-800">{invoice.createdByName || 'Unknown'}</div>
                <div className="text-sm">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusClass(invoice.status)}`}>
                    {invoice.status || 'draft'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentInvoices;

