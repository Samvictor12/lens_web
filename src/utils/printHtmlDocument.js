/**
 * Print an HTML document via a hidden iframe (Chrome-friendly).
 * Avoids window.open + noopener (null handle / leftover tabs).
 *
 * @param {string} html - Full HTML document string
 * @param {{ title?: string, delayMs?: number, waitForImages?: boolean }} [opts]
 */
export function printHtmlDocument(html, opts = {}) {
  if (!html) return;

  const title = opts.title || "Print";
  const delayMs = opts.delayMs ?? 400;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    throw new Error("Could not open print frame. Try again or check browser permissions.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  const triggerPrint = () => {
    try {
      if (!win) {
        cleanup();
        return;
      }
      win.onafterprint = cleanup;
      win.focus();
      win.print();
      // Safety if onafterprint never fires (Cancel on some browsers)
      setTimeout(cleanup, 2500);
    } catch {
      cleanup();
      throw new Error("Print failed. Please try again.");
    }
  };

  const runPrint = () => {
    if (opts.waitForImages && win?.document) {
      const imgs = [...win.document.images];
      const loads = imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
      );
      Promise.all(loads).then(() => setTimeout(triggerPrint, Math.min(delayMs, 150)));
      return;
    }
    triggerPrint();
  };

  // Wait for images/fonts so A4 layout is ready
  const ready = win?.document?.fonts?.ready;
  if (ready && typeof ready.then === "function") {
    ready
      .then(() => setTimeout(runPrint, Math.min(delayMs, 200)))
      .catch(() => setTimeout(runPrint, delayMs));
  } else {
    setTimeout(runPrint, delayMs);
  }
}
