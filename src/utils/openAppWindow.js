/**
 * Open an in-app route in a new browser / app tab.
 *
 * Uses an absolute same-origin URL so the new tab loads the SPA correctly.
 *
 * @param {string} path - Absolute path within this app (e.g. "/sales/orders/add")
 * @returns {Window | null}
 */
export function openAppWindow(path) {
  const url = new URL(path, window.location.origin).href;
  return window.open(url, "_blank");
}
