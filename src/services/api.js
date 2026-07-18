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

const AUTH_STORAGE_KEYS = [
  "lens_management_token",
  "lens_management_refresh_token",
  "lens_management_user",
];

function clearLocalAuth() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

async function revokeSessionBestEffort(refreshToken) {
  if (!refreshToken) return;
  try {
    await fetch(`${api.defaults.baseURL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Device: "Web",
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (_) {
    // Best-effort revoke — local clear still proceeds
  }
}

async function failRefreshAndForceLogout(error, refreshToken) {
  processQueue(error, null);
  isRefreshing = false;
  await revokeSessionBestEffort(refreshToken);
  clearLocalAuth();
  window.dispatchEvent(new CustomEvent("auth:session-expired"));
}

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

      // Skip token refresh for login and refresh endpoints (avoid recursion)
      if (
        originalRequest.url &&
        (originalRequest.url.includes("/auth/login") ||
          originalRequest.url.includes("/auth/refresh"))
      ) {
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

        const refreshToken = localStorage.getItem(
          "lens_management_refresh_token"
        );

        if (!refreshToken) {
          await failRefreshAndForceLogout(error, null);
          return Promise.reject(error);
        }

        try {
          // Attempt to refresh the token (raw axios — not api interceptor)
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          );

          const accessToken = response.data?.success
            ? response.data?.data?.accessToken
            : null;
          const newRefreshToken = response.data?.data?.refreshToken;

          if (accessToken) {
            localStorage.setItem("lens_management_token", accessToken);
            if (newRefreshToken) {
              localStorage.setItem(
                "lens_management_refresh_token",
                newRefreshToken
              );
            }

            api.defaults.headers.common["Authorization"] =
              `Bearer ${accessToken}`;
            originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

            processQueue(null, accessToken);
            isRefreshing = false;

            return api(originalRequest);
          }

          // Non-throwing non-success (or success without access token)
          const failError = new Error(
            response.data?.message || "Token refresh failed"
          );
          await failRefreshAndForceLogout(failError, refreshToken);
          return Promise.reject(failError);
        } catch (refreshError) {
          await failRefreshAndForceLogout(refreshError, refreshToken);
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
