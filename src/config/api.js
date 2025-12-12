// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'http://172.20.10.12:5001' : 'http://172.20.10.12:5001');

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    PROFILE: `${API_BASE_URL}/api/auth/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/auth/profile`,
  },
  CUSTOMERS: {
    BASE: `${API_BASE_URL}/api/customers`,
    BY_ID: (id) => `${API_BASE_URL}/api/customers/${id}`,
    SERVICES: (customerId) => `${API_BASE_URL}/api/customers/${customerId}/services`,
    ADD_SERVICE: (customerId) => `${API_BASE_URL}/api/customers/${customerId}/services`,
  },
  SERVICES: {
    BASE: `${API_BASE_URL}/api/services`,
    BY_ID: (id) => `${API_BASE_URL}/api/services/${id}`,
    RECORDS: `${API_BASE_URL}/api/services/records`,
    RECORD_BY_ID: (serviceId, recordId) => `${API_BASE_URL}/api/services/records/${serviceId}/${recordId}`,
    UPDATE_RECORD: (serviceId, recordId) => `${API_BASE_URL}/api/services/records/${serviceId}/${recordId}`,
    RECORD_COMMANDS: (serviceId, recordId) => `${API_BASE_URL}/api/services/records/${serviceId}/${recordId}/commands`,
    ADD_RECORD_COMMANDS: (serviceId, recordId) => `${API_BASE_URL}/api/services/records/${serviceId}/${recordId}/commands`,
    DELETE_RECORD: (serviceId, recordId) => `${API_BASE_URL}/api/services/records/${serviceId}/${recordId}`,
  },
  USERS: {
    BASE: `${API_BASE_URL}/api/users`,
    BY_ID: (id) => `${API_BASE_URL}/api/users/${id}`,
  },
  SALES: {
    BASE: `${API_BASE_URL}/api/sales`,
    BY_ID: (id) => `${API_BASE_URL}/api/sales/${id}`,
    SEARCH_CUSTOMERS: `${API_BASE_URL}/api/sales/customers/search`,
  },
  LEADS: {
    BASE: `${API_BASE_URL}/api/leads`,
    CHECK: (customerId) => `${API_BASE_URL}/api/leads/check/${customerId}`,
  },
  PASSWORD: {
    SET_PASSWORD: `${API_BASE_URL}/api/password/set-password`,
    RESET_PASSWORD: `${API_BASE_URL}/api/password/reset-password`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/password/forgot-password`,
    VERIFY_TOKEN: (token) => `${API_BASE_URL}/api/password/verify-token/${token}`,
  },
  DASHBOARD: {
    STATS: `${API_BASE_URL}/api/dashboard/stats`,
    WEEKLY_REVENUE: `${API_BASE_URL}/api/dashboard/weekly-revenue`,
  },
  FORM_DATA: {
    BASE: `${API_BASE_URL}/api/form-data`,
    BY_ID: (id) => `${API_BASE_URL}/api/form-data/${id}`,
  },
  ATTENDANCE: {
    BASE: `${API_BASE_URL}/api/attendance`,
    TODAY: `${API_BASE_URL}/api/attendance/today`,
    SIGN_IN: `${API_BASE_URL}/api/attendance/sign-in`,
    SIGN_OUT: `${API_BASE_URL}/api/attendance/sign-out`,
  },
  HEALTH: `${API_BASE_URL}/api/health`,
};

export default API_BASE_URL;

