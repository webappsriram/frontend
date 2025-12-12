import React, { useState, useEffect, useRef } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import dayjs from 'dayjs';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SummaryCard from '../components/SummaryCard';
import WeeklyRevenueChart from '../components/MonthlyRevenueChart';
import NewTemplatesCard from '../components/NewTemplatesCard';
import RecentInvoices from '../components/RecentInvoices';
import { apiRequestJson, API_ENDPOINTS } from '../utils/api';
import { getAuthToken } from '../utils/auth';

const Dashboard = () => {
  // On mobile, sidebar starts closed. On desktop, it's always open
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);
  const previousSelectionRef = useRef(null);
  
  // Initialize date range to today
  const getTodayDate = () => {
    return new Date();
  };

  const today = getTodayDate();
  const [dateRange, setDateRange] = useState({
    startDate: today,
    endDate: today,
    key: 'selection'
  });
  
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    myRevenue: 0,
    totalSales: 0,
    mySales: 0,
    totalCustomers: 0,
    revenueChange: 0,
    myRevenueChange: 0,
    salesChange: 0,
    mySalesChange: 0,
    customersChange: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState({
    isSignedIn: false,
    isSignedOut: false,
    signInTime: null,
    signOutTime: null
  });
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        const fromDateStr = dateRange.startDate ? dayjs(dateRange.startDate).format('YYYY-MM-DD') : '';
        const toDateStr = dateRange.endDate ? dayjs(dateRange.endDate).format('YYYY-MM-DD') : '';
        const url = `${API_ENDPOINTS.DASHBOARD.STATS}?fromDate=${fromDateStr}&toDate=${toDateStr}`;
        const response = await apiRequestJson(url);
        if (response.success) {
          setDashboardStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (dateRange.startDate && dateRange.endDate) {
      fetchDashboardStats();
    }
  }, [dateRange]);

  // Fetch today's attendance status
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(API_ENDPOINTS.ATTENDANCE.TODAY, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAttendanceStatus(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch attendance status:', error);
      }
    };

    fetchAttendanceStatus();
  }, []);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Format currency value
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

  // Format number with commas
  const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    const numValue = parseFloat(value) || 0;
    return numValue.toLocaleString();
  };

  // Format change value
  const formatChange = (change, isCurrency) => {
    if (change === null || change === undefined || isNaN(change)) {
      return '0';
    }
    const numChange = parseFloat(change) || 0;
    if (numChange === 0) return '0';
    const sign = numChange > 0 ? '+' : '';
    if (isCurrency) {
      return `${sign}${formatCurrency(Math.abs(numChange))}`;
    }
    return `${sign}${Math.abs(numChange).toLocaleString()}`;
  };

  // Handle sign in
  const handleSignIn = async () => {
    try {
      setIsAttendanceLoading(true);
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.ATTENDANCE.SIGN_IN, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setAttendanceStatus(prev => ({
          ...prev,
          isSignedIn: true,
          signInTime: data.data.signInTime
        }));
        alert('Signed in successfully!');
      } else {
        alert(data.message || 'Failed to sign in');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Failed to sign in. Please try again.');
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setIsAttendanceLoading(true);
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.ATTENDANCE.SIGN_OUT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setAttendanceStatus(prev => ({
          ...prev,
          isSignedOut: true,
          signOutTime: data.data.signOutTime
        }));
        alert('Signed out successfully!');
      } else {
        alert(data.message || 'Failed to sign out');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[240px]'
      }`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="flex-1 p-4 md:p-5">
          {/* Date Range Selector with Daily Login */}
          <div className="bg-white rounded-lg p-4 md:p-5 shadow-sm mb-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Daily Login Section */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {attendanceStatus.isSignedIn && (
                    <span className="text-xs text-gray-600">
                      Signed in: {formatTime(attendanceStatus.signInTime)}
                    </span>
                  )}
                  {attendanceStatus.isSignedOut && (
                    <span className="text-xs text-gray-600">
                      | Signed out: {formatTime(attendanceStatus.signOutTime)}
                    </span>
                  )}
                </div>
                {!attendanceStatus.isSignedIn ? (
                  <button
                    onClick={handleSignIn}
                    disabled={isAttendanceLoading}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none inline-flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2V8M8 2L6 4M8 2L10 4M3 8C3 10.7614 5.23858 13 8 13C10.7614 13 13 10.7614 13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {isAttendanceLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                ) : !attendanceStatus.isSignedOut ? (
                  <button
                    onClick={handleSignOut}
                    disabled={isAttendanceLoading}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none inline-flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 14V6M8 14L6 12M8 14L10 12M13 8C13 5.23858 10.7614 3 8 3C5.23858 3 3 5.23858 3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {isAttendanceLoading ? 'Signing out...' : 'Sign Out'}
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold">
                    Completed for today
                  </span>
                )}
              </div>
              
              {/* Date Range Selector */}
              <div className="relative" style={{ width: '220px' }} ref={datePickerRef}>
                <input
                  type="text"
                  readOnly
                  value={dateRange.startDate && dateRange.endDate 
                    ? `${dayjs(dateRange.startDate).format('DD/MM/YYYY')} – ${dayjs(dateRange.endDate).format('DD/MM/YYYY')}`
                    : 'Select date range'}
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2]/10 cursor-pointer bg-white"
                  style={{ fontSize: '13px' }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-end pr-2.5">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-gray-400">
                    <path d="M6 2V4M14 2V4M3 6H17M4 4H16C16.5304 4 17.0391 4.21071 17.4142 4.58579C17.7893 4.96086 18 5.46957 18 6V16C18 16.5304 17.7893 17.0391 17.4142 17.4142C17.0391 17.7893 16.5304 18 16 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V6C2 5.46957 2.21071 4.96086 2.58579 4.58579C2.96086 4.21071 3.46957 4 4 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {showDatePicker && (
                  <div className="absolute top-full right-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <DateRange
                      ranges={[dateRange]}
                      onChange={(item) => {
                        if (item.selection) {
                          const newStartDate = item.selection.startDate;
                          const newEndDate = item.selection.endDate;
                          
                          if (newStartDate && newEndDate) {
                            const startTime = new Date(newStartDate).setHours(0, 0, 0, 0);
                            const endTime = new Date(newEndDate).setHours(0, 0, 0, 0);
                            const prevStartTime = previousSelectionRef.current?.startTime;
                            const prevEndTime = previousSelectionRef.current?.endTime;
                            
                            // Check if same date was clicked twice (single day selection)
                            const isSameDateTwice = startTime === endTime && 
                                                   prevStartTime === startTime && 
                                                   prevEndTime === endTime;
                            
                            // Check if range is selected (different dates)
                            const isRangeSelected = startTime !== endTime;
                            
                            setDateRange(item.selection);
                            
                            // Close if:
                            // 1. Range is selected (different dates)
                            // 2. OR same date clicked twice (single day selection)
                            if (isRangeSelected || isSameDateTwice) {
                              // Small delay to allow the selection to be visible
                              setTimeout(() => {
                                setShowDatePicker(false);
                              }, 100);
                            }
                            
                            // Store current selection for next comparison
                            previousSelectionRef.current = {
                              startTime,
                              endTime
                            };
                          }
                        }
                      }}
                      maxDate={new Date()}
                      showDateDisplay={false}
                      moveRangeOnFirstSelection={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
            <SummaryCard
              icon="💰"
              title="Total Revenue"
              value={isLoading ? 'Loading...' : formatCurrency(dashboardStats.totalRevenue)}
              change={isLoading ? '' : formatChange(dashboardStats.revenueChange, true)}
              changeType={dashboardStats.revenueChange >= 0 ? 'positive' : 'negative'}
              iconColor="orange"
            />
            <SummaryCard
              icon="💵"
              title="My Revenue"
              value={isLoading ? 'Loading...' : formatCurrency(dashboardStats.myRevenue)}
              change={isLoading ? '' : formatChange(dashboardStats.myRevenueChange, true)}
              changeType={dashboardStats.myRevenueChange >= 0 ? 'positive' : 'negative'}
              iconColor="blue"
            />
            <SummaryCard
              icon="📄"
              title="Sales"
              value={isLoading ? 'Loading...' : formatNumber(dashboardStats.totalSales)}
              change={isLoading ? '' : formatChange(dashboardStats.salesChange, false)}
              changeType={dashboardStats.salesChange >= 0 ? 'positive' : 'negative'}
              iconColor="green"
            />
            <SummaryCard
              icon="📋"
              title="My Sales"
              value={isLoading ? 'Loading...' : formatNumber(dashboardStats.mySales)}
              change={isLoading ? '' : formatChange(dashboardStats.mySalesChange, false)}
              changeType={dashboardStats.mySalesChange >= 0 ? 'positive' : 'negative'}
              iconColor="purple"
            />
            <SummaryCard
              icon="👥"
              title="Clients"
              value={isLoading ? 'Loading...' : formatNumber(dashboardStats.totalCustomers)}
              change={isLoading ? '' : formatChange(dashboardStats.customersChange, false)}
              changeType={dashboardStats.customersChange >= 0 ? 'positive' : 'negative'}
              iconColor="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <WeeklyRevenueChart 
              fromDate={dateRange.startDate} 
              toDate={dateRange.endDate} 
            />
            <RecentInvoices />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

