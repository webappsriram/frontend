import React from 'react';


const MonthlyRevenueChart = () => {
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const maxValue = 15000;
  const values = [8000, 10000, 12000, 15000, 11000, 13000, 14000, 12000, 10000];
  const highlightedMonth = 'Jun';
  const highlightedIndex = months.indexOf(highlightedMonth);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="mb-6">
        <div className="text-sm text-gray-600 mb-1">Monthly Revenue</div>
        <div className="text-2xl font-bold text-gray-800">$15,000</div>
      </div>
      <div className="h-64">
        <div className="h-full flex items-end justify-between gap-2">
          {months.map((month, index) => {
            const height = (values[index] / maxValue) * 100;
            const isHighlighted = index === highlightedIndex;
            return (
              <div key={month} className="flex-1 flex flex-col items-center h-full">
                <div className="relative w-full h-full flex items-end justify-center">
                  <div
                    className={`w-full rounded-t transition-all cursor-pointer relative group ${
                      isHighlighted 
                        ? 'bg-[#4A90E2]' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${month}: $${values[index].toLocaleString()}`}
                  >
                    {isHighlighted && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        $15,000
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">{month}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonthlyRevenueChart;

