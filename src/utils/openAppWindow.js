/**
 * Open an in-app route in a new browser / PWA window.
 *
 * Uses an absolute same-origin URL so the new tab loads the SPA correctly.
 * In installed app (standalone) mode, Chromium/Edge often reclaim the existing
 * window for same-origin opens — window features + navigate-new in the
 * web manifest force a separate app window instead of "pushing" Edge.
 *
 * Keeps window.opener so popup pages can close/return to the list.
 *
 * @param {string} path - Absolute path within this app (e.g. "/sales/orders/add")
 * @returns {Window | null}
 */
export function openAppWindow(path) {
  const url = new URL(path, window.location.origin).href;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // iOS Safari installed web app
    Boolean(window.navigator.standalone);

  if (isStandalone) {
    const width = Math.min(1280, Math.max(960, window.screen.availWidth - 80));
    const height = Math.min(900, Math.max(700, window.screen.availHeight - 80));
    const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
    return window.open(
      url,
      "_blank",
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`
    );
  }

  return window.open(url, "_blank");
}
