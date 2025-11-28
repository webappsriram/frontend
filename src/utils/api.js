import { getAuthHeaders } from './auth';
import { API_ENDPOINTS } from '../config/api';

/**
 * Make an API request with authentication
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const apiRequest = async (url, options = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};

/**
 * Make an authenticated API request and parse JSON
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>}
 */
export const apiRequestJson = async (url, options = {}) => {
  const response = await apiRequest(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
};

export { API_ENDPOINTS };

