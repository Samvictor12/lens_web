import React, { useState, useEffect, useCallback } from "react";
import {
  Printer,
  Tag,
  CreditCard,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Settings,
} from "lucide-react";
import {
  checkPrintServiceHealth,
  getLocalPrinters,
  getPrinterConfigs,
} from "@/services/printerConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DeviceHealthSignal({ onOpenSettings }) {
  const [serviceStatus, setServiceStatus] = useState(null); // null=checking, true=up, false=down
  const [printers, setPrinters] = useState([]); // [{ name, status_code, status }]
  const [configs, setConfigs] = useState({
    barcodePrinter: "",
    cardPrinter: "",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Service health check
      const health = await checkPrintServiceHealth();
      const isUp = Boolean(health);
      setServiceStatus(isUp);

      // 2. Fetch printer configs from backend
      try {
        const cfgRes = await getPrinterConfigs();
        if (cfgRes?.success && Array.isArray(cfgRes.data)) {
          let bName = "";
          let cName = "";
          cfgRes.data.forEach((c) => {
            if (c.config_type === "BARCODE_LABEL") bName = c.printer_name || "";
            if (c.config_type === "AUTHENTICITY_CARD" || c.config_type === "LENS_SPECIFICATION") {
              cName = c.printer_name || "";
            }
          });
          setConfigs({ barcodePrinter: bName, cardPrinter: cName });
        }
      } catch (_) {}

      // 3. If service is up, query local Windows printers
      if (isUp) {
        try {
          const listRes = await getLocalPrinters();
          const details = listRes?.details || (listRes?.printers || []).map((name) => ({ name, status: "Ready" }));
          setPrinters(details);
        } catch (_) {
          setPrinters([]);
        }
      } else {
        setPrinters([]);
      }
    } catch (_) {
      setServiceStatus(false);
      setPrinters([]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Auto-poll health every 12 seconds
    const timer = setInterval(checkHealth, 12000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  // Helper to evaluate device status
  const getDeviceStatus = (configuredName) => {
    if (!serviceStatus) {
      return {
        level: "error",
        label: "Service Offline",
        detail: "LensPrintService.exe is not running on localhost:9333",
      };
    }
    if (!configuredName) {
      return {
        level: "unconfigured",
        label: "Not Configured",
        detail: "No printer assigned in Settings → Print Service",
      };
    }

    const found = printers.find(
      (p) => p.name.toLowerCase() === configuredName.toLowerCase()
    );

    if (!found) {
      return {
        level: "warning",
        label: "Printer Not Found",
        detail: `"${configuredName}" not detected by Windows Spooler`,
      };
    }

    const sc = found.status_code || 0;
    if (sc & 0x00000080) {
      return {
        level: "error",
        label: "Offline",
        detail: `Printer "${configuredName}" is Offline. Check cable/power.`,
      };
    }
    if (sc & 0x00000010 || sc & 0x00200000) {
      return {
        level: "warning",
        label: "Out of Paper",
        detail: `Printer "${configuredName}" is out of labels/paper.`,
      };
    }
    if (sc & 0x00400000) {
      return {
        level: "warning",
        label: "Door Open",
        detail: `Printer "${configuredName}" cover is open.`,
      };
    }
    if (sc & 0x00000002) {
      return {
        level: "error",
        label: "Error State",
        detail: `Printer "${configuredName}" reported an error state.`,
      };
    }

    return {
      level: "ready",
      label: "Ready",
      detail: found.status || "Ready to print",
    };
  };

  const barcodeStatus = getDeviceStatus(configs.barcodePrinter);
  const cardStatus = getDeviceStatus(configs.cardPrinter);

  const getStatusColor = (level) => {
    switch (level) {
      case "ready":
        return "bg-emerald-500 text-emerald-500 border-emerald-500/30";
      case "warning":
        return "bg-amber-500 text-amber-500 border-amber-500/30";
      case "error":
        return "bg-rose-500 text-rose-500 border-rose-500/30";
      default:
        return "bg-slate-400 text-slate-400 border-slate-400/30";
    }
  };

  const getBadgeStyle = (level) => {
    switch (level) {
      case "ready":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      case "error":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Device 1: Barcode / Label Printer */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium transition-all shadow-xs select-none",
                getBadgeStyle(barcodeStatus.level)
              )}
            >
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-semibold">Barcode:</span>
                <span className="max-w-[110px] truncate text-[11px]" title={configs.barcodePrinter || "Not configured"}>
                  {configs.barcodePrinter || "Not set"}
                </span>
              </div>

              {/* Live signal indicator */}
              <div className="flex items-center gap-1 pl-1 border-l border-current/20">
                <span className="relative flex h-2 w-2">
                  {barcodeStatus.level === "ready" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      barcodeStatus.level === "ready"
                        ? "bg-emerald-500"
                        : barcodeStatus.level === "warning"
                        ? "bg-amber-500"
                        : barcodeStatus.level === "error"
                        ? "bg-rose-500"
                        : "bg-slate-400"
                    )}
                  />
                </span>
                <span className="text-[10px] uppercase font-bold tracking-tight">
                  {barcodeStatus.label}
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs p-2.5 space-y-1">
            <div className="font-semibold flex items-center justify-between gap-2">
              <span>Device 1: Barcode / Thermal Printer</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                  getBadgeStyle(barcodeStatus.level)
                )}
              >
                {barcodeStatus.label}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px]">{barcodeStatus.detail}</p>
            <p className="text-[10px] text-muted-foreground pt-1 border-t">
              Target: <strong>{configs.barcodePrinter || "None"}</strong> · Size: 75×50 mm
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Device 2: Card / Specification Printer */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium transition-all shadow-xs select-none",
                getBadgeStyle(cardStatus.level)
              )}
            >
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-semibold">Card:</span>
                <span className="max-w-[110px] truncate text-[11px]" title={configs.cardPrinter || "Not configured"}>
                  {configs.cardPrinter || "Not set"}
                </span>
              </div>

              {/* Live signal indicator */}
              <div className="flex items-center gap-1 pl-1 border-l border-current/20">
                <span className="relative flex h-2 w-2">
                  {cardStatus.level === "ready" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      cardStatus.level === "ready"
                        ? "bg-emerald-500"
                        : cardStatus.level === "warning"
                        ? "bg-amber-500"
                        : cardStatus.level === "error"
                        ? "bg-rose-500"
                        : "bg-slate-400"
                    )}
                  />
                </span>
                <span className="text-[10px] uppercase font-bold tracking-tight">
                  {cardStatus.label}
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs p-2.5 space-y-1">
            <div className="font-semibold flex items-center justify-between gap-2">
              <span>Device 2: DC Customer Card Printer</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                  getBadgeStyle(cardStatus.level)
                )}
              >
                {cardStatus.label}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px]">{cardStatus.detail}</p>
            <p className="text-[10px] text-muted-foreground pt-1 border-t">
              Target: <strong>{configs.cardPrinter || "None"}</strong> · Size: 84×55 mm (Evolis)
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Quick Refresh Signal Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={checkHealth}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("h-3 w-3 text-muted-foreground", isRefreshing && "animate-spin text-primary")}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Refresh printer connection signal
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
