import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SummaryCard from '../components/SummaryCard';
import MonthlyRevenueChart from '../components/MonthlyRevenueChart';
import NewTemplatesCard from '../components/NewTemplatesCard';
import RecentInvoices from '../components/RecentInvoices';

const Dashboard = () => {
  // On mobile, sidebar starts closed. On desktop, it's always open
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <SummaryCard
              icon="💰"
              title="Total Revenue"
              value="$216k"
              change="+$341"
              changeType="positive"
              iconColor="orange"
            />
            <SummaryCard
              icon="📄"
              title="Sales"
              value="2,221"
              change="+121"
              changeType="positive"
              iconColor="green"
            />
            <SummaryCard
              icon="👥"
              title="Clients"
              value="1,423"
              change="+91"
              changeType="positive"
              iconColor="blue"
            />
            <SummaryCard
              icon="❤️"
              title="Loyalty"
              value="78%"
              change="-1%"
              changeType="negative"
              iconColor="red"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <MonthlyRevenueChart />
            <NewTemplatesCard />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RecentInvoices />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

