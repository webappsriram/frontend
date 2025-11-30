import React from 'react';

const SummaryCard = ({ icon, title, value, change, changeType, iconColor }) => {
  const iconColorClasses = {
    orange: 'bg-orange-50',
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    red: 'bg-red-50',
  };

  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${iconColorClasses[iconColor] || 'bg-gray-50'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs text-gray-600 mb-1.5">{title}</div>
        <div className="text-xl font-bold text-gray-800 mb-1">{value}</div>
        <div className={`text-xs font-semibold ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {changeType === 'positive' ? '↑' : '↓'} {change}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;

