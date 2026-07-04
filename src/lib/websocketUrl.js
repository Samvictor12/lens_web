const stripTrailingSlashes = (value) => value.replace(/\/+$/, "");

export const buildWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const apiUrl = import.meta.env.VITE_WEB_API_URL;
  if (apiUrl) {
    const url = new URL(apiUrl, window.location.origin);
    if (url.pathname.endsWith("/api")) {
      url.pathname = url.pathname.slice(0, -4) || "/";
    }
    url.pathname = `${stripTrailingSlashes(url.pathname)}/ws`;
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};
