import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function toDateInputValue(date) {
  return date.toISOString().split("T")[0];
}

export function getPresetRange(preset) {
  const to = new Date();
  const from = new Date();
  if (preset === "30d") {
    from.setDate(from.getDate() - 30);
  } else {
    from.setDate(from.getDate() - 7);
  }
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export function exportTablePdf({ title, columns, rows, filename }) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 22,
    styles: { fontSize: 9 },
  });
  doc.save(filename);
}

export function exportTableCsv({ columns, rows, filename }) {
  const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const lines = [
    columns.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
