import React from 'react';
import Pagination from './Pagination';
import { hasRole } from '../utils/auth';
import './ServicesTable.css';

const ServicesTable = ({
  services,
  isLoadingServices,
  searchQuery,
  servicePagination,
  serviceCurrentPage,
  serviceItemsPerPage,
  onPageChange,
  onViewCommands,
  onEdit,
  onDelete
}) => {
  return (
    <div className="customers-table-card">
      <div className="table-container">
        <div className="table-header">
          <div className="table-cell">Service Name</div>
          <div className="table-cell">Status</div>
          <div className="table-cell">Date</div>
          <div className="table-cell">Actions</div>
        </div>
        <div className="table-body">
          {isLoadingServices ? (
            <div className="table-empty">
              <p>Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="table-empty">
              <p>No services found</p>
            </div>
          ) : (
            services.map((service) => {
              // Apply client-side search filter
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch = 
                  (service.serviceName && service.serviceName.toLowerCase().includes(query)) ||
                  (service.status && service.status.toLowerCase().includes(query));
                if (!matchesSearch) {
                  return null;
                }
              }
              return (
                <div 
                  key={`${service.serviceId}-${service.id}`} 
                  className="table-row table-row-clickable"
                  onClick={() => onViewCommands(service)}
                >
                  <div className="table-cell" data-label="Service Name">{service.serviceName}</div>
                  <div className="table-cell" data-label="Status">
                    <span className={`status-badge status-${service.status?.toLowerCase().replace(/\s+/g, '-') || 'yet-to-start'}`}>
                      {service.status || 'Yet to start'}
                    </span>
                  </div>
                  <div className="table-cell" data-label="Date">
                    {service.createdOn 
                      ? new Date(service.createdOn).toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })
                      : '-'}
                  </div>
                  <div className="table-cell" data-label="Actions">
                    <div className="action-buttons">
                      <button 
                        className="action-btn" 
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(service);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 13.3333H14M10.6667 2.66667C10.9309 2.40245 11.293 2.25245 11.6667 2.25245C12.0404 2.25245 12.4025 2.40245 12.6667 2.66667C12.9309 2.93089 13.0809 3.29301 13.0809 3.66667C13.0809 4.04033 12.9309 4.40245 12.6667 4.66667L5.33333 12L2 13.3333L3.33333 10L10.6667 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {hasRole('admin', 'master_user') && (
                        <button 
                          className="action-btn action-btn-delete" 
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(service);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }).filter(Boolean)
          )}
        </div>
      </div>
      {!isLoadingServices && services.length > 0 && servicePagination && (
        <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate' }}>
          <Pagination
            currentPage={serviceCurrentPage}
            totalPages={servicePagination.totalPages || Math.ceil((servicePagination.total || services.length) / serviceItemsPerPage) || 1}
            onPageChange={(page) => {
              onPageChange(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            totalItems={servicePagination.total || services.length}
            itemsPerPage={serviceItemsPerPage}
          />
        </div>
      )}
    </div>
  );
};

export default ServicesTable;

