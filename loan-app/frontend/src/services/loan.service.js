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

export const calculateEMI = async (data) => {
  return await apiHandler("/api/loans/calculate-emi", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getRtoWorks = async () => {
  return await apiHandler("/api/loans/rto-works", {
    method: "GET",
  });
};

export const createRtoWork = async (name) => {
  return await apiHandler("/api/loans/rto-works", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
};

export const getSeizedPending = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/pending-payments${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getFollowupLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/followups${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getPendingEmiDetails = async (id) => {
  return await apiHandler(`/api/loans/pending-details/${id}`, {
    method: "GET",
  });
};

export const updatePaymentStatus = async (id, paymentStatus) => {
  return await apiHandler(`/api/loans/${id}/payment-status`, {
    method: "PATCH",
    body: JSON.stringify({ paymentStatus }),
  });
};
export const getForeclosureLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/foreclosure${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};
export const forecloseLoan = async (id, data) => {
  return await apiHandler(`/api/loans/${id}/foreclose`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};
export const getSeizedVehicles = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/seized-vehicles${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};
export const updateSeizedStatus = async (
  id,
  seizedStatus,
  soldDetails = null,
) => {
  return await apiHandler(`/api/loans/seized-vehicles/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ seizedStatus, soldDetails }),
  });
};

export const getAnalyticsStats = async () => {
  return await apiHandler("/api/loans/analytics/stats", {
    method: "GET",
  });
};
