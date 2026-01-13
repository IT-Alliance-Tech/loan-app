import apiHandler from "./api";

export const createCustomer = async (data) => {
  return await apiHandler("/api/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getCustomers = async () => {
  return await apiHandler("/api/customers", {
    method: "GET",
  });
};

export const searchCustomer = async (loanNumber) => {
  return await apiHandler(`/api/customers/${loanNumber}`, {
    method: "GET",
  });
};
