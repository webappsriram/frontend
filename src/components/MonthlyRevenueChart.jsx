import React from 'react';
import './MonthlyRevenueChart.css';

const MonthlyRevenueChart = () => {
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const maxValue = 15000;
  const values = [8000, 10000, 12000, 15000, 11000, 13000, 14000, 12000, 10000];
  const highlightedMonth = 'Jun';
  const highlightedIndex = months.indexOf(highlightedMonth);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Monthly Revenue</div>
          <div className="chart-value">$15,000</div>
        </div>
      </div>
      <div className="chart-container">
        <div className="chart-bars">
          {months.map((month, index) => {
            const height = (values[index] / maxValue) * 100;
            const isHighlighted = index === highlightedIndex;
            return (
              <div key={month} className="chart-bar-wrapper">
                <div
                  className={`chart-bar ${isHighlighted ? 'highlighted' : ''}`}
                  style={{ height: `${height}%` }}
                  title={`${month}: $${values[index].toLocaleString()}`}
                >
                  {isHighlighted && (
                    <div className="chart-tooltip">$15,000</div>
                  )}
                </div>
                <div className="chart-label">{month}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonthlyRevenueChart;

