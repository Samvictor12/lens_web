import axios from "axios";

// In Vite, env variables must be prefixed with VITE_
const api = axios.create({
  baseURL: import.meta.env.VITE_WEB_API_URL || "http://localhost:5001/api",
  // timeout: 10000,
});

// Flag to prevent multiple refresh attempts
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

// Auto-inject headers
api.interceptors.request.use(
  (config) => {
    config.headers["Device"] = "Web"; // Always Web for React web app
    const token = localStorage.getItem("lens_management_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration and refresh
api.interceptors.response.use(
  (response) => response, // pass through successful responses
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      const { status } = error.response;

      // Skip token refresh for login endpoint
      if (originalRequest.url && originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      // Handle 401 Unauthorized - attempt token refresh
      if (status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem("lens_management_refresh_token");

        if (!refreshToken) {
          // No refresh token, clear storage and reject
          isRefreshing = false;
          localStorage.removeItem("lens_management_token");
          localStorage.removeItem("lens_management_refresh_token");
          localStorage.removeItem("lens_management_user");
          
          // Let the app handle redirect instead of hard refresh
          const event = new CustomEvent('auth:session-expired');
          window.dispatchEvent(event);
          
          return Promise.reject(error);
        }

        try {
          // Attempt to refresh the token
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          );

          if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;

            // Update tokens in localStorage
            localStorage.setItem("lens_management_token", accessToken);
            localStorage.setItem("lens_management_refresh_token", newRefreshToken);

            // Update authorization header
            api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
            originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

            // Process queued requests
            processQueue(null, accessToken);
            isRefreshing = false;

            // Retry the original request
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, logout user
          processQueue(refreshError, null);
          isRefreshing = false;

          localStorage.removeItem("lens_management_token");
          localStorage.removeItem("lens_management_refresh_token");
          localStorage.removeItem("lens_management_user");

          // Let the app handle redirect and notification
          const event = new CustomEvent('auth:session-expired');
          window.dispatchEvent(event);
          
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
