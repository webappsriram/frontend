import React, { useState, useEffect } from 'react';
import { apiRequestJson, API_ENDPOINTS } from '../utils/api';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(weekOfYear);

const WeeklyRevenueChart = ({ fromDate, toDate }) => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  useEffect(() => {
    const fetchWeeklyRevenue = async () => {
      try {
        setIsLoading(true);
        // If no date range provided, fetch last 5 weeks
        let fromDateStr = fromDate ? dayjs(fromDate).format('YYYY-MM-DD') : '';
        let toDateStr = toDate ? dayjs(toDate).format('YYYY-MM-DD') : '';
        
        // If no dates provided, calculate last 5 weeks
        if (!fromDateStr || !toDateStr) {
          const today = dayjs();
          toDateStr = today.format('YYYY-MM-DD');
          fromDateStr = today.subtract(35, 'days').format('YYYY-MM-DD'); // 5 weeks = 35 days
        }
        
        const url = `${API_ENDPOINTS.DASHBOARD.WEEKLY_REVENUE}?fromDate=${fromDateStr}&toDate=${toDateStr}`;
        const response = await apiRequestJson(url);
        
        // Generate last 5 weeks dates
        const today = dayjs(toDateStr || new Date());
        const last5Weeks = [];
        for (let i = 4; i >= 0; i--) {
          const weekStart = today.subtract(i * 7, 'days').startOf('week');
          last5Weeks.push({
            weekStart: weekStart.format('YYYY-MM-DD'),
            yearWeek: weekStart.format('YYYY') + weekStart.week(),
            revenue: 0
          });
        }
        
        if (response.success) {
          const apiData = response.data.weeklyData || [];
          
          // Merge API data with generated weeks
          const mergedData = last5Weeks.map(week => {
            const apiWeek = apiData.find(api => {
              const apiWeekStart = dayjs(api.weekStart).startOf('week');
              const weekStart = dayjs(week.weekStart).startOf('week');
              return apiWeekStart.isSame(weekStart, 'week');
            });
            
            return {
              week: `Week ${dayjs(week.weekStart).week()}`,
              weekStart: week.weekStart,
              revenue: apiWeek ? apiWeek.revenue : 0,
              yearWeek: week.yearWeek
            };
          });
          
          setWeeklyData(mergedData);
          setTotalRevenue(response.data.totalRevenue || 0);
          // Highlight the last week by default
          if (mergedData.length > 0) {
            setHighlightedIndex(mergedData.length - 1);
          }
        } else {
          // If API fails, still show the weeks with 0 revenue
          const defaultData = last5Weeks.map(week => ({
            week: `Week ${dayjs(week.weekStart).week()}`,
            weekStart: week.weekStart,
            revenue: 0,
            yearWeek: week.yearWeek
          }));
          setWeeklyData(defaultData);
          setTotalRevenue(0);
          setHighlightedIndex(defaultData.length - 1);
        }
      } catch (error) {
        console.error('Failed to fetch weekly revenue:', error);
        // Generate last 5 weeks even on error (always show dates on x-axis)
        const today = dayjs(toDateStr || new Date());
        const last5Weeks = [];
        for (let i = 4; i >= 0; i--) {
          const weekStart = today.subtract(i * 7, 'days').startOf('week');
          last5Weeks.push({
            week: `Week ${weekStart.week()}`,
            weekStart: weekStart.format('YYYY-MM-DD'),
            revenue: 0,
            yearWeek: weekStart.format('YYYY') + String(weekStart.week()).padStart(2, '0')
          });
        }
        setWeeklyData(last5Weeks);
        setTotalRevenue(0);
        if (last5Weeks.length > 0) {
          setHighlightedIndex(last5Weeks.length - 1);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyRevenue();
  }, [fromDate, toDate]);

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₹0.00';
    }
    const numValue = parseFloat(value) || 0;
    if (numValue >= 10000000) {
      return `₹${(numValue / 10000000).toFixed(1)}Cr`;
    } else if (numValue >= 100000) {
      return `₹${(numValue / 100000).toFixed(1)}L`;
    } else if (numValue >= 1000) {
      return `₹${(numValue / 1000).toFixed(1)}k`;
    }
    return `₹${numValue.toFixed(2)}`;
  };

  const maxValue = weeklyData.length > 0 
    ? Math.max(...weeklyData.map(week => week.revenue), 1)
    : 1;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-1">Weekly Revenue</div>
          <div className="text-2xl font-bold text-gray-800">Loading...</div>
        </div>
      </div>
    );
  }

  if (weeklyData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-1">Weekly Revenue</div>
          <div className="text-2xl font-bold text-gray-800">₹0.00</div>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="mb-6">
        <div className="text-sm text-gray-600 mb-1">Weekly Revenue</div>
        <div className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</div>
      </div>
      <div className="h-64">
        <div className="h-full flex items-end justify-between gap-2 px-2">
          {weeklyData.map((week, index) => {
            const height = maxValue > 0 ? (week.revenue / maxValue) * 100 : 0;
            const isHighlighted = index === highlightedIndex;
            const weekStartDate = dayjs(week.weekStart);
            const weekEndDate = weekStartDate.endOf('week');
            const weekLabel = `${weekStartDate.format('DD MMM')} - ${weekEndDate.format('DD MMM')}`;
            return (
              <div 
                key={week.yearWeek || index} 
                className="flex flex-col items-center h-full"
                style={{ width: 'calc(20% - 8px)' }}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseLeave={() => setHighlightedIndex(weeklyData.length - 1)}
              >
                <div className="relative w-full h-full flex items-end justify-center">
                  <div
                    className={`w-3/4 rounded-t transition-all cursor-pointer relative group ${
                      isHighlighted 
                        ? 'bg-[#4A90E2]' 
                        : week.revenue > 0
                        ? 'bg-gray-300 hover:bg-gray-400'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${weekLabel}: ${formatCurrency(week.revenue)}`}
                  >
                    {isHighlighted && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {formatCurrency(week.revenue)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2 text-center leading-tight">{weekLabel}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyRevenueChart;

