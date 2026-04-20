import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  };
};

const interestLoanService = {
  createLoan: async (loanData) => {
    const response = await axios.post(`${API_URL}/interest-loans`, loanData, getAuthConfig());
    return response.data;
  },

  getAllLoans: async (params = {}) => {
    const response = await axios.get(`${API_URL}/interest-loans`, {
      ...getAuthConfig(),
      params,
    });
    return response.data;
  },

  getLoanById: async (id) => {
    const response = await axios.get(`${API_URL}/interest-loans/${id}`, getAuthConfig());
    return response.data;
  },

  updateLoan: async (id, loanData) => {
    const response = await axios.put(`${API_URL}/interest-loans/${id}`, loanData, getAuthConfig());
    return response.data;
  },

  deleteLoan: async (id) => {
    const response = await axios.delete(`${API_URL}/interest-loans/${id}`, getAuthConfig());
    return response.data;
  },

  addPrincipalPayment: async (id, paymentData) => {
    const response = await axios.post(
      `${API_URL}/interest-loans/${id}/principal-payment`,
      paymentData,
      getAuthConfig()
    );
    return response.data;
  },

  payInterestEMI: async (emiId, paymentData) => {
    const response = await axios.put(
      `${API_URL}/interest-loans/emi/${emiId}/pay`,
      paymentData,
      getAuthConfig()
    );
    return response.data;
  },

  getPendingPayments: async (params = {}) => {
    const response = await axios.get(`${API_URL}/interest-loans/pending`, {
      ...getAuthConfig(),
      params,
    });
    return response.data;
  },
};

export default interestLoanService;
