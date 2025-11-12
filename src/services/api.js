import axios from "axios";

// In Vite, env variables must be prefixed with VITE_
const api = axios.create({
  baseURL: import.meta.env.VITE_WEB_API_URL || "http://localhost:5001/api",
  // timeout: 10000,
});

// Auto-inject headers
api.interceptors.request.use(
  (config) => {
    config.headers["Device"] = "Web"; // Always Web for React web app
    const token = localStorage.getItem("crs_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration or missing token
api.interceptors.response.use(
  (response) => response, // pass through successful responses
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401 && localStorage.getItem("crs_token")) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("crs_token");
        localStorage.removeItem("crs_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
