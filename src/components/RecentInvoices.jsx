import React from 'react';


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
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-800">Recent Sales</h3>
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-5 gap-4 pb-3 border-b-2 border-gray-100 mb-3 min-w-full">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">No</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Created</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Client</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</div>
        </div>
        <div className="flex flex-col gap-0">
          {invoices.map((invoice, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
              <div className="text-sm text-gray-800">{invoice.no}</div>
              <div className="text-sm text-gray-800">{invoice.date}</div>
              <div className="text-sm text-gray-800">{invoice.client}</div>
              <div className="text-sm text-gray-800">{invoice.amount}</div>
              <div className="text-sm">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  invoice.statusType === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
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

