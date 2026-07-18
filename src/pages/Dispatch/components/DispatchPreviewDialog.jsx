import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { buildDispatchHtml, printDispatch } from "../Dispatch.constants";

/**
 * DC Preview — same A4 HTML as print (iframe srcDoc), mirrors InvoicePreviewDialog.
 */
export default function DispatchPreviewDialog({ dispatch, open, onClose }) {
  const { company } = useCompany();
  const companyForPrint = dispatch?.company || company;
  const html = dispatch ? buildDispatchHtml(dispatch, companyForPrint) : "";

  return (
    <Dialog open={open} onOpenChange={onClose} size="wide">
      <DialogContent className="!flex h-[92vh] max-h-[92vh] flex-col gap-3 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>
            Dispatch Challan Preview{dispatch ? ` — ${dispatch.dcNumber}` : ""}
          </DialogTitle>
          <DialogDescription>
            A4 print layout (210 × 297 mm) — same sheet as Print / Save as PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-slate-300/70">
          <iframe
            key={dispatch?.id || dispatch?.dcNumber || "dc-preview"}
            srcDoc={html}
            title="Dispatch challan preview"
            className="block h-full w-full border-0 bg-slate-300/70"
            style={{ minHeight: 0 }}
          />
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            type="button"
            onClick={() => printDispatch(dispatch, companyForPrint)}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
