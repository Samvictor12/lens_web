import api from "./api";

export async function apiClient(method, url, options = {}) {
  try {
    const { data, params, headers, ...rest } = options;
    const response = await api.request({
      method,
      url,
      data,
      params,
      headers,
      ...rest,
    });
    // console.log("response", response);

    return response.data;
  } catch (err) {
    // console.error("Login failed", err.response?.data || err.message);

    // console.error("API Error:", err);
    throw err.response?.data || err.message;
  }
}
