const stripTrailingSlashes = (value) => value.replace(/\/+$/, "");

const sameOriginWsUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};

export const buildWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // Docker/nginx builds: use the page host so /ws is proxied by frontend nginx.
  // Avoids connecting to the API hostname, which often has no WebSocket upgrade.
  if (import.meta.env.VITE_WS_SAME_ORIGIN === "true") {
    return sameOriginWsUrl();
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

  return sameOriginWsUrl();
};
