import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Scan button that opens a camera QR/barcode scanner modal.
 * Calls onScan(decodedText) once a code is detected, then closes.
 */
export function QrScanButton({ onScan, label = "Scan QR", className = "" }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  // Unique DOM id — Dialog portals mount after open flips true
  const regionId = `qr-reader-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    let timer = null;

    const waitForElement = () =>
      new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
          if (cancelled) {
            reject(new Error("cancelled"));
            return;
          }
          const el = document.getElementById(regionId);
          if (el) {
            resolve(el);
            return;
          }
          if (Date.now() - started > 3000) {
            reject(new Error("Scanner area failed to open. Close and try again."));
            return;
          }
          timer = setTimeout(tick, 50);
        };
        tick();
      });

    const start = async () => {
      setError(null);
      try {
        await waitForElement();
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            const value = decodedText?.trim();
            if (value) {
              onScan?.(value);
              setOpen(false);
            }
          },
          () => {}
        );
      } catch (err) {
        if (cancelled || err?.message === "cancelled") return;
        setError(err?.message || "Unable to access camera. Allow camera permission and try again.");
      }
    };

    // Let Dialog portal paint first
    timer = setTimeout(start, 100);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [open, onScan, regionId]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`gap-1.5 h-8 ${className}`}
        onClick={() => setOpen(true)}
      >
        <ScanLine className="w-4 h-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-base">Scan Sale Order QR</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
              aria-label="Close scanner"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="px-4 pb-4 space-y-2">
            <div id={regionId} className="w-full overflow-hidden rounded-lg bg-black min-h-[260px]" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground text-center">
              Format: <span className="font-medium">Order No | Customer Ref</span>
              <br />
              e.g. SO-2026-001 | 098765
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
