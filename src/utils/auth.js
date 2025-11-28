// Store token in localStorage
export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

// Get token from localStorage
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Remove token from localStorage
export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Get auth headers for API requests
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAuthToken();
};

// Decode JWT token to get user info
export const getUserFromToken = () => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    // JWT token has 3 parts: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return null;

    // Decode base64 payload
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Get user role from token
export const getUserRole = () => {
  const user = getUserFromToken();
  return user?.role || null;
};

// Check if user has required role
export const hasRole = (...allowedRoles) => {
  const userRole = getUserRole();
  return userRole && allowedRoles.includes(userRole);
};

