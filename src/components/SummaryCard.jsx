import React from 'react';
import './SummaryCard.css';

const SummaryCard = ({ icon, title, value, change, changeType, iconColor }) => {
  return (
    <div className="summary-card">
      <div className={`summary-icon ${iconColor}`}>
        {icon}
      </div>
      <div className="summary-content">
        <div className="summary-title">{title}</div>
        <div className="summary-value">{value}</div>
        <div className={`summary-change ${changeType}`}>
          {changeType === 'positive' ? '↑' : '↓'} {change}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;

