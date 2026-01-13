import apiHandler from './api';

export const createLoan = async (loanData) => {
  return await apiHandler('/api/loans', {
    method: 'POST',
    body: JSON.stringify(loanData),
  });
};

export const getLoans = async () => {
  return await apiHandler('/api/loans', {
    method: 'GET',
  });
};

export const searchLoan = async (loanNumber) => {
  return await apiHandler(`/api/loans/search/${loanNumber}`, {
    method: 'GET',
  });
};

export const updateLoan = async (id, loanData) => {
  return await apiHandler(`/api/loans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(loanData),
  });
};

export const toggleSeized = async (id) => {
  return await apiHandler(`/api/loans/${id}/seized`, {
    method: 'PATCH',
  });
};
