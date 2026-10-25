import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach the saved JWT to authenticated requests.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("smartspend_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize API errors and clear an expired session.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("smartspend_token");
      localStorage.removeItem("smartspend_user");
    }

    return Promise.reject(error);
  }
);

export const getApiError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error.response) {
    return "Unable to connect to SmartSpend. Check whether the backend is running.";
  }

  return "Something went wrong. Please try again.";
};

export default api;