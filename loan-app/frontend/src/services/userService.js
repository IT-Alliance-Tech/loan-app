import apiHandler from "./api";

export const getEmployees = async () => {
  return await apiHandler("/api/users", {
    method: "GET",
  });
};

export const createEmployee = async (employeeData) => {
  return await apiHandler("/api/users", {
    method: "POST",
    body: JSON.stringify(employeeData),
  });
};

export const toggleEmployeeStatus = async (id) => {
  return await apiHandler(`/api/users/${id}/status`, {
    method: "PATCH",
  });
};
