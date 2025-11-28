import React from 'react';
import './RecentInvoices.css';

const RecentInvoices = () => {
  const invoices = [
    {
      no: 'PQ-4491C',
      date: '3 Jul, 2020',
      client: 'Daniel Padilla',
      amount: '$2,450',
      status: 'PAID',
      statusType: 'success',
    },
    {
      no: 'IN-9911J',
      date: '21 May, 2021',
      client: 'Christina Jacobs',
      amount: '$14,810',
      status: 'OVERDUE',
      statusType: 'error',
    },
    {
      no: 'UV-2319A',
      date: '14 Apr, 2020',
      client: 'Elizabeth Bailey',
      amount: '$450',
      status: 'PAID',
      statusType: 'success',
    },
  ];

  return (
    <div className="invoices-card">
      <div className="card-header">
        <h3 className="card-title">Recent Sales</h3>
      </div>
      <div className="invoices-table">
        <div className="table-header">
          <div className="table-cell">No</div>
          <div className="table-cell">Date Created</div>
          <div className="table-cell">Client</div>
          <div className="table-cell">Amount</div>
          <div className="table-cell">Status</div>
        </div>
        <div className="table-body">
          {invoices.map((invoice, index) => (
            <div key={index} className="table-row">
              <div className="table-cell" data-label="No:">{invoice.no}</div>
              <div className="table-cell" data-label="Date:">{invoice.date}</div>
              <div className="table-cell" data-label="Client:">{invoice.client}</div>
              <div className="table-cell" data-label="Amount:">{invoice.amount}</div>
              <div className="table-cell" data-label="Status:">
                <span className={`status-badge ${invoice.statusType}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentInvoices;

