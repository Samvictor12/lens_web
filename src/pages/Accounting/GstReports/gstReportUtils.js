export const fmt = (v) =>
  `₹${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export function todayInputDate() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function firstDayOfMonth() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

export function printReport(title, html) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 13px; }
      h1 { font-size: 18px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 12px; }
      th { background: #f1f1f1; }
      .text-right { text-align: right; }
    </style></head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (_) {
      /* ignore */
    }
  }, 300);
}
