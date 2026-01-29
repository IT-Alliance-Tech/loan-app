import { getToken, setToken, removeToken } from "../utils/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const apiHandler = async (endpoint, options = {}, isRetry = false) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: "include",
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // If unauthorized and not already retrying, attempt to refresh token
    if (response.status === 401 && !isRetry) {
      if (isRefreshing) {
        // If already refreshing, return a promise that resolves when refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            // Retry with new token
            return apiHandler(endpoint, options, true);
          })
          .catch((err) => {
            throw err;
          });
      }

      isRefreshing = true;

      try {
        console.log("Access token expired, attempting refresh...");
        const refreshSuccess = await attemptRefresh();

        if (refreshSuccess) {
          console.log("Refresh successful, retrying request...");
          processQueue(null, getToken());
          isRefreshing = false;
          // Retry the original request with new token
          return apiHandler(endpoint, options, true);
        } else {
          console.warn("Refresh failed, logging out...");
          processQueue(new Error("Refresh failed"), null);
          isRefreshing = false;
          // Refresh failed, logout user
          logoutUser();
          throw new Error("Session expired. Please login again.");
        }
      } catch (error) {
        processQueue(error, null);
        isRefreshing = false;
        logoutUser();
        throw error;
      }
    }

    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.message || "Something went wrong");
    }

    return result;
  } catch (error) {
    throw error;
  }
};

// Queue to hold requests while refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const attemptRefresh = async () => {
  try {
    // Note: credentials include sends the refreshToken cookie
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();

    if (data.status === "success" && data.data.token) {
      setToken(data.data.token);
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};

const logoutUser = () => {
  removeToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

export default apiHandler;
