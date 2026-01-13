import { getToken } from '../utils/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const apiHandler = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const result = await response.json();

  if (result.status !== 'success') {
    throw new Error(result.message || 'Something went wrong');
  }

  return result;
};

export default apiHandler;
