import apiHandler from "./api";

export const createExpense = async (expenseData) => {
  return await apiHandler("/api/expenses", {
    method: "POST",
    body: JSON.stringify(expenseData),
  });
};

export const getAllExpenses = async () => {
  return await apiHandler("/api/expenses", {
    method: "GET",
  });
};

export const searchLoanInfo = async (query) => {
  return await apiHandler(`/api/expenses/search?q=${query}`, {
    method: "GET",
  });
};

export const getLoanExpensesTotal = async (loanId) => {
  return await apiHandler(`/api/expenses/loan/${loanId}`, {
    method: "GET",
  });
};
