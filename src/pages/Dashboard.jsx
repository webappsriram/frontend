import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SummaryCard from '../components/SummaryCard';
import MonthlyRevenueChart from '../components/MonthlyRevenueChart';
import NewTemplatesCard from '../components/NewTemplatesCard';
import RecentInvoices from '../components/RecentInvoices';
import './Dashboard.css';

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
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`dashboard-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="dashboard-content">
          <div className="summary-cards">
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

          <div className="dashboard-middle">
            <MonthlyRevenueChart />
            <NewTemplatesCard />
          </div>

          <div className="dashboard-bottom">
            <RecentInvoices />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

