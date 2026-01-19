import apiHandler from "./api";

export const createLoan = async (loanData) => {
  return await apiHandler("/api/loans", {
    method: "POST",
    body: JSON.stringify(loanData),
  });
};

export const getLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(`/api/loans${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
};

export const searchLoan = async (loanNumber) => {
  return await apiHandler(`/api/loans/search/${loanNumber}`, {
    method: "GET",
  });
};

export const getLoanById = async (id) => {
  return await apiHandler(`/api/loans/${id}`, {
    method: "GET",
  });
};

export const updateLoan = async (id, loanData) => {
  return await apiHandler(`/api/loans/${id}`, {
    method: "PUT",
    body: JSON.stringify(loanData),
  });
};

export const toggleSeized = async (id) => {
  return await apiHandler(`/api/loans/${id}/seized`, {
    method: "PATCH",
  });
};
