import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printReport } from "../GstReports/gstReportUtils";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellXml(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

/** Client-side Excel download (SpreadsheetML .xls that Excel opens with exact header row). */
export async function downloadExcel({ filename, sheetName = "Report", headers, rows }) {
  const safeSheet = String(sheetName || "Report").replace(/[\\/*?:\[\]]/g, " ").slice(0, 31);
  const headerRow = headers?.length
    ? `<Row>${headers.map((h) => cellXml(h)).join("")}</Row>`
    : "";
  const body = (rows || []).map((row) => `<Row>${row.map((c) => cellXml(c)).join("")}</Row>`).join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXml(safeSheet)}">
    <Table>${headerRow}${body}</Table>
  </Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const base = filename.endsWith(".xls") || filename.endsWith(".xlsx") ? filename.replace(/\.xlsx$/i, ".xls") : `${filename}.xls`;
  link.download = base;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPdf(title, html) {
  printReport(title, html);
}

export function ReportExportButtons({ disabled, onExcel, onPdf }) {
  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={disabled} onClick={onExcel}>
        <Download className="h-3.5 w-3.5" /> Export Excel
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={disabled} onClick={onPdf}>
        <Printer className="h-3.5 w-3.5" /> Export PDF
      </Button>
    </>
  );
}

export function tableHtml(headers, rows, title) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = (rows || [])
    .map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`)
    .join("");
  return `<h1>${title}</h1><table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}">No data</td></tr>`}</tbody></table>`;
}
