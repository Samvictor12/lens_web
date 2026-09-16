import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Download,
  Package,
  IndianRupee,
  ClipboardList,
  Boxes,
  Timer,
  X,
  FileText,
} from "lucide-react";
import { Refresh } from "@/components/ui/Refresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { buildWebSocketUrl } from "@/lib/websocketUrl";
import { cn } from "@/lib/utils";
import {
  getPurchaseOrders,
  getPurchaseOrderDashboard,
  deletePurchaseOrder,
  getPOReceipts,
  downloadPurchaseOrderExcel,
} from "@/services/purchaseOrder";
import { purchaseOrderFilters, getIstDateString, VENDOR_BILL_ELIGIBLE_STATUSES, ALL_STATUS, DATE_TYPE_ALL, DATE_TYPE_RECEIVED, PENDING_STATUS } from "./PurchaseOrder.constants";
import PurchaseOrderFilter from "./PurchaseOrderFilter";
import VendorBillTab from "./VendorBillTab";
import { openAppWindow } from "@/utils/openAppWindow";
import { usePurchaseOrderColumns } from "./usePurchaseOrderColumns";
import CreateVendorInvoiceDialog from "@/pages/Accounting/VendorPayments/CreateVendorInvoiceDialog";
import DownloadPODialog from "./DownloadPODialog";
import { getVendorDropdown } from "@/services/vendor";

const EMPTY_STATS = {
  jobsReceived: 0,
  vendorInvoiceValue: 0,
  pendingVendorPo: 0,
  totalOutsourced: 0,
  averageTat: 0,
};

function formatInr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

/** Receive window for cards 1–2: today IST, or bar From–To when date type is received/all. */
function getCardReceiveWindow(filters) {
  const today = getIstDateString();
  const hasRange = Boolean(filters.start_date) || Boolean(filters.end_date);
  const dateType = filters.date_type || DATE_TYPE_ALL;
  const useFilterForCards =
    hasRange && (dateType === DATE_TYPE_RECEIVED || dateType === DATE_TYPE_ALL);
  return {
    start: useFilterForCards ? filters.start_date || filters.end_date : today,
    end: useFilterForCards ? filters.end_date || filters.start_date : today,
  };
}

/** Merge bar filters with clickable card quick-filter (card overrides conflicting fields). */
function buildListFilters(filters, activeCard) {
  if (!activeCard) return filters;

  const next = { ...filters };
  const receiveWindow = getCardReceiveWindow(filters);

  switch (activeCard) {
    case "jobsReceivedToday":
    case "todayVendorInvoiceValue":
      return {
        ...next,
        status: ALL_STATUS,
        date_type: DATE_TYPE_RECEIVED,
        start_date: receiveWindow.start,
        end_date: receiveWindow.end,
      };
    case "pendingVendorPo":
      return {
        ...next,
        status: PENDING_STATUS,
        start_date: "",
        end_date: "",
        date_type: DATE_TYPE_ALL,
      };
    case "totalOutsourced":
      return {
        ...next,
        status: ALL_STATUS,
      };
    case "averageTat":
      return {
        ...next,
        status: ALL_STATUS,
        has_receipts: true,
      };
    default:
      return filters;
  }
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("table");
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sorting, setSorting] = useState([]);

  // Filter states
  const [filters, setFilters] = useState(purchaseOrderFilters);

  // Purchase Order data
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active tab — default to Purchase Orders List
  const [activeTab, setActiveTab] = useState("list");
  const [activeCard, setActiveCard] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Lens Type filter — default to Single
  const [orderType, setOrderType] = useState("Single");

  // Selection state for batch download
  const [selectedPos, setSelectedPos] = useState([]); // array of full PO objects
  const selectedIds = useMemo(() => new Set(selectedPos.map((p) => p.id)), [selectedPos]);
  const [vendors, setVendors] = useState([]);
  const [raiseBillOpen, setRaiseBillOpen] = useState(false);
  const [raiseBillVendorId, setRaiseBillVendorId] = useState(null);
  const [raiseBillPoIds, setRaiseBillPoIds] = useState([]);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadVendorId, setDownloadVendorId] = useState(null);
  const [downloadPoIds, setDownloadPoIds] = useState([]);

  useEffect(() => {
    localStorage.setItem("purchaseOrdersView", "table");
  }, []);

  useEffect(() => {
    getVendorDropdown()
      .then((res) => {
        if (res.success) setVendors(res.data || []);
      })
      .catch(() => {});
  }, []);

  // Handle delete purchase order click
  const handleDeleteClick = (po) => {
    setPoToDelete(po);
    setDeleteDialogOpen(true);
  };

  // Handle receive purchase order click
  const handleReceive = (po) => {
    navigate(`/masters/purchase-orders/receive/${po.id}`);
  };

  const handleInward = async (po) => {
    try {
      const res = await getPOReceipts(po.id);
      if (res.success && res.data.receipts?.length > 0) {
        const sorted = [...res.data.receipts].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        openAppWindow(`/masters/purchase-orders/receive/${po.id}/inward/${sorted[0].id}`);
        return;
      }

      toast({
        title: "No receipt found",
        description: "Create or update a receipt before pushing items to inventory.",
        variant: "destructive",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to load receipt details for inventory inward.",
        variant: "destructive",
      });
    }
  };

  // Handle edit receipt click — open receive page in edit mode with latest receipt
  const handleEditReceive = async (po) => {
    try {
      const res = await getPOReceipts(po.id);
      if (res.success && res.data.receipts?.length > 0) {
        // Sort by createdAt desc to get the latest receipt
        const sorted = [...res.data.receipts].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        navigate(`/masters/purchase-orders/receive/${po.id}/edit/${sorted[0].id}`);
      } else {
        // Fallback: open normal receive page
        navigate(`/masters/purchase-orders/receive/${po.id}`);
      }
    } catch {
      navigate(`/masters/purchase-orders/receive/${po.id}`);
    }
  };

  // Handle PO Excel download (single)
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (po) => {
    if (downloadingId) return;
    setDownloadingId(po.id);
    try {
      await downloadPurchaseOrderExcel(po.id, po.poNumber, po.orderDate);
    } catch {
      toast({
        title: "Download failed",
        description: "Could not export the PO to Excel.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Toggle selection for a PO row
  const handleToggleSelect = (po) => {
    setSelectedPos((prev) => {
      const exists = prev.some((p) => p.id === po.id);
      if (exists) return prev.filter((p) => p.id !== po.id);
      // Bulk: limit to 1 selection at a time
      if (orderType === "Bulk") return [po];
      return [...prev, po];
    });
  };

  const handleSelectAllPage = (checked) => {
    if (orderType === "Bulk") return;
    setSelectedPos(checked ? purchaseOrders : []);
  };

  const allPageSelected =
    purchaseOrders.length > 0 &&
    purchaseOrders.every((po) => selectedIds.has(po.id));
  const somePageSelected =
    !allPageSelected && purchaseOrders.some((po) => selectedIds.has(po.id));

  // Clear selection when type filter or page changes
  useEffect(() => { setSelectedPos([]); }, [orderType, pageIndex]);

  const handleOpenDownloadPO = () => {
    if (selectedPos.length === 0) {
      setDownloadVendorId(null);
      setDownloadPoIds([]);
      setDownloadOpen(true);
      return;
    }

    const singles = selectedPos.filter(
      (p) => (p.orderType || "Single") === "Single" && p.status === "DRAFT"
    );
    if (singles.length === 0) {
      const hasSingle = selectedPos.some((p) => (p.orderType || "Single") === "Single");
      toast({
        title: hasSingle ? "PO not eligible for download" : "Bulk PO selected",
        description: hasSingle
          ? "Excel download is available for pending (Draft) Single POs only."
          : "Excel download is available for pending Single POs only. Use the download dialog to pick POs.",
        variant: "destructive",
      });
      setDownloadVendorId(null);
      setDownloadPoIds([]);
      setDownloadOpen(true);
      return;
    }

    const vendorIds = [...new Set(singles.map((p) => p.vendor?.id ?? p.vendorId).filter(Boolean))];
    if (vendorIds.length !== 1) {
      toast({
        title: "Mixed vendors selected",
        description: "All selected POs must be from the same vendor. Open download and pick a vendor.",
        variant: "destructive",
      });
      setDownloadVendorId(null);
      setDownloadPoIds([]);
      setDownloadOpen(true);
      return;
    }

    setDownloadVendorId(vendorIds[0]);
    setDownloadPoIds(singles.map((p) => p.id));
    setDownloadOpen(true);
  };

  const handleRaiseVendorBill = () => {
    if (selectedPos.length === 0) {
      setRaiseBillVendorId(null);
      setRaiseBillPoIds([]);
      setRaiseBillOpen(true);
      return;
    }

    const vendorIds = [...new Set(selectedPos.map((p) => p.vendor?.id ?? p.vendorId).filter(Boolean))];
    if (vendorIds.length !== 1) {
      toast({
        title: "Mixed vendors selected",
        description: "All selected POs must be from the same vendor to raise a bill.",
        variant: "destructive",
      });
      return;
    }

    const ineligible = selectedPos.filter(
      (p) => !VENDOR_BILL_ELIGIBLE_STATUSES.includes(p.status)
    );
    if (ineligible.length) {
      toast({
        title: "POs not eligible for billing",
        description: "Select received POs that do not already have a vendor bill.",
        variant: "destructive",
      });
      return;
    }

    setRaiseBillVendorId(vendorIds[0]);
    setRaiseBillPoIds(selectedPos.map((p) => p.id));
    setRaiseBillOpen(true);
  };

  const handleVendorBillCreated = () => {
    setSelectedPos([]);
    setRaiseBillPoIds([]);
    setRaiseBillVendorId(null);
    setRefreshKey((prev) => prev + 1);
    setActiveTab("vendor-bill");
  };

  // Get table columns with delete handler
  const columns = usePurchaseOrderColumns(
    navigate,
    handleDeleteClick,
    handleReceive,
    handleEditReceive,
    handleInward,
    handleDownload,
    downloadingId,
    selectedIds,
    handleToggleSelect,
    handleSelectAllPage,
    allPageSelected,
    somePageSelected,
    orderType === "Bulk" || purchaseOrders.length === 0,
  );

  const isTodayStatsMode = useMemo(() => {
    const hasRange = Boolean(filters.start_date) || Boolean(filters.end_date);
    const dateType = filters.date_type || DATE_TYPE_ALL;
    // Cards 1–2 use From–To only when filtering by received (or All which includes received)
    return !(hasRange && (dateType === DATE_TYPE_RECEIVED || dateType === DATE_TYPE_ALL));
  }, [filters.start_date, filters.end_date, filters.date_type]);

  const listFilters = useMemo(
    () => buildListFilters(filters, activeCard),
    [filters, activeCard]
  );

  // Fetch purchase orders from API
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";

      const response = await getPurchaseOrders(
        pageIndex + 1,
        pageSize,
        searchQuery,
        { ...listFilters, orderType },
        sortField,
        sortDirection
      );

      if (response.success) {
        setPurchaseOrders(response.data);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch purchase orders",
        variant: "destructive",
      });
      setPurchaseOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, listFilters, sorting, orderType, toast]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const receiveWindow = getCardReceiveWindow(filters);
      const statsFilters = {
        ...filters,
        orderType,
        card_receive_start_date: receiveWindow.start,
        card_receive_end_date: receiveWindow.end,
      };
      const response = await getPurchaseOrderDashboard(searchQuery, statsFilters);
      if (response.success) {
        setStats({ ...EMPTY_STATS, ...(response.data || {}) });
      }
    } catch (error) {
      console.error("Error fetching purchase order stats:", error);
      setStats(EMPTY_STATS);
    } finally {
      setStatsLoading(false);
    }
  }, [searchQuery, filters, orderType]);

  // Fetch purchase orders on mount and when dependencies change
  useEffect(() => {
    if (activeTab !== "list") return;
    fetchPurchaseOrders();
    fetchStats();
  }, [activeTab, fetchPurchaseOrders, fetchStats, refreshKey]);

  // WebSocket Live Refresh
  useEffect(() => {
    const wsUrl = buildWebSocketUrl();

    let socket = null;
    let reconnectTimeout = null;

    const connect = () => {
      console.log(`🔌 Connecting to WebSocket at ${wsUrl}`);
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'PURCHASE_ORDER_UPDATED') {
            console.log('📡 WebSocket live refresh event: PURCHASE_ORDER_UPDATED');
            setRefreshKey((prev) => prev + 1);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        console.log('🔌 WebSocket connection closed. Attempting reconnect in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
      };
    };

    connect();

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    toast({
      title: "Refreshed",
      description:
        activeTab === "vendor-bill"
          ? "Vendor Bill view has been refreshed."
          : "Purchase order list has been refreshed.",
    });
  };

  // Card click applies quick-filter to the list (merged via buildListFilters)
  const handleCardClick = (cardKey) => {
    setPageIndex(0);
    if (activeCard === cardKey) {
      setActiveCard(null);
      return;
    }
    setActiveCard(cardKey);
    // Card owns status/date slice — clear bar conflicts (same pattern as Sale Orders)
    if (
      cardKey === "pendingVendorPo" ||
      cardKey === "jobsReceivedToday" ||
      cardKey === "todayVendorInvoiceValue" ||
      cardKey === "totalOutsourced" ||
      cardKey === "averageTat"
    ) {
      setFilters((prev) => ({ ...prev, status: null }));
    }
  };

  const summaryCards = [
    {
      key: "jobsReceivedToday",
      label: isTodayStatsMode ? "Jobs Received Today" : "Jobs Received",
      value: statsLoading ? "…" : stats.jobsReceived,
      icon: Package,
      theme: {
        card: "bg-gradient-to-br from-blue-50 to-blue-100/80 border-blue-200/80 hover:border-blue-300",
        selected: "ring-2 ring-blue-500 border-blue-400 shadow-md shadow-blue-100",
        iconWrap: "bg-blue-500 text-white shadow-sm shadow-blue-200",
        label: "text-blue-700/80",
        value: "text-blue-950",
      },
    },
    {
      key: "todayVendorInvoiceValue",
      label: isTodayStatsMode ? "Today Vendor Invoice Value" : "Vendor Invoice Value",
      value: statsLoading ? "…" : formatInr(stats.vendorInvoiceValue),
      icon: IndianRupee,
      theme: {
        card: "bg-gradient-to-br from-emerald-50 to-teal-100/70 border-emerald-200/80 hover:border-emerald-300",
        selected: "ring-2 ring-emerald-500 border-emerald-400 shadow-md shadow-emerald-100",
        iconWrap: "bg-emerald-500 text-white shadow-sm shadow-emerald-200",
        label: "text-emerald-700/80",
        value: "text-emerald-950",
      },
    },
    {
      key: "pendingVendorPo",
      label: "Pending Vendor PO",
      value: statsLoading ? "…" : stats.pendingVendorPo,
      icon: ClipboardList,
      theme: {
        card: "bg-gradient-to-br from-amber-50 to-orange-100/70 border-amber-200/80 hover:border-amber-300",
        selected: "ring-2 ring-amber-500 border-amber-400 shadow-md shadow-amber-100",
        iconWrap: "bg-amber-500 text-white shadow-sm shadow-amber-200",
        label: "text-amber-800/80",
        value: "text-amber-950",
      },
    },
    {
      key: "totalOutsourced",
      label: "Total Out Sourced",
      value: statsLoading ? "…" : stats.totalOutsourced,
      icon: Boxes,
      theme: {
        card: "bg-gradient-to-br from-indigo-50 to-violet-100/60 border-indigo-200/80 hover:border-indigo-300",
        selected: "ring-2 ring-indigo-500 border-indigo-400 shadow-md shadow-indigo-100",
        iconWrap: "bg-indigo-500 text-white shadow-sm shadow-indigo-200",
        label: "text-indigo-700/80",
        value: "text-indigo-950",
      },
    },
    {
      key: "averageTat",
      label: "Average TAT",
      value: statsLoading ? "…" : `${stats.averageTat}d`,
      icon: Timer,
      theme: {
        card: "bg-gradient-to-br from-cyan-50 to-sky-100/70 border-cyan-200/80 hover:border-cyan-300",
        selected: "ring-2 ring-cyan-500 border-cyan-400 shadow-md shadow-cyan-100",
        iconWrap: "bg-cyan-500 text-white shadow-sm shadow-cyan-200",
        label: "text-cyan-800/80",
        value: "text-cyan-950",
      },
    },
  ];

  // Handle delete purchase order
  const handleDeleteConfirm = async () => {
    if (!poToDelete) return;

    try {
      setIsDeleting(true);
      await deletePurchaseOrder(poToDelete.id);

      toast({
        title: "Success",
        description: `Purchase Order "${poToDelete.poNumber}" has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
      setPoToDelete(null);

      // Refresh purchase order list and cards
      fetchPurchaseOrders();
      fetchStats();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      (filters.status != null && filters.status !== "all") ||
      filters.vendor_id !== null ||
      Boolean(filters.start_date) ||
      Boolean(filters.end_date) ||
      (filters.date_type != null && filters.date_type !== "all") ||
      orderType !== "Single"
    );
  }, [filters, orderType]);

  const handleFilterChange = (next) => {
    setFilters(next);
    if (
      next.status !== filters.status ||
      next.start_date !== filters.start_date ||
      next.end_date !== filters.end_date ||
      next.date_type !== filters.date_type
    ) {
      setActiveCard(null);
    }
    setPageIndex(0);
  };

  const handleClearFilters = () => {
    setFilters(purchaseOrderFilters);
    setOrderType("Single");
    setPageIndex(0);
    setActiveCard(null);
  };

  // For client-side display, we use the purchase orders directly from API
  // Backend handles filtering, so we just display what we receive
  const displayPurchaseOrders = purchaseOrders;

  const handleUpload = () => {
    toast({
      title: "Coming Soon",
      description: "Excel upload functionality will be available soon.",
    });
  };

  const handleDownloadSample = () => {
    toast({
      title: "Coming Soon",
      description: "Sample template download will be available soon.",
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Purchase Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage purchase orders and vendor purchases
          </p>
        </div>
        <div className="flex gap-1.5 items-center">
          <Refresh onClick={handleRefresh} className="shrink-0" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs shrink-0"
            onClick={handleClearFilters}
            disabled={!(hasActiveFilters || Boolean(activeCard) || Boolean(searchQuery.trim()))}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="gap-1.5 h-8 border-blue-400 text-blue-700 hover:bg-blue-50 whitespace-nowrap shrink-0"
            onClick={handleOpenDownloadPO}
          >
            <Download className="h-3.5 w-3.5" />
            Download PO
            {selectedPos.length > 0 ? ` (${selectedPos.length})` : ""}
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="gap-1.5 h-8 border-emerald-400 text-emerald-700 hover:bg-emerald-50 whitespace-nowrap shrink-0"
            onClick={handleRaiseVendorBill}
          >
            <FileText className="h-3.5 w-3.5" />
            Raise Vendor Bill
            {selectedPos.length > 0 ? ` (${selectedPos.length})` : ""}
          </Button>
          <Button
            size="xs"
            className="gap-1.5 h-8"
            asChild
          >
            <a href="/masters/purchase-orders/add" target="_blank" rel="noopener noreferrer">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Purchase Order</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
          <TabsTrigger value="list">Purchase Orders List</TabsTrigger>
          <TabsTrigger value="vendor-bill">Vendor Bill</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">

          {/* Search + filters — same compact row as Sale Orders */}
          <Card className="p-2 flex-shrink-0 mb-3">
            <div className="flex w-full flex-wrap items-center gap-1.5">
              <div className="relative min-w-[160px] max-w-[280px] flex-[1.4]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search PO, vendor, customer ref..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPageIndex(0);
                  }}
                  className="pl-8 h-8 w-full text-xs"
                />
              </div>
              <PurchaseOrderFilter
                filters={filters}
                onChange={handleFilterChange}
                orderType={orderType}
                onOrderTypeChange={(val) => {
                  setOrderType(val);
                  setPageIndex(0);
                }}
              />
            </div>
          </Card>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 flex-shrink-0 mb-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              const selected = activeCard === card.key;
              const t = card.theme;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => handleCardClick(card.key)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border text-left transition-all duration-200",
                    "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    t.card,
                    selected ? t.selected : "shadow-sm"
                  )}
                >
                  <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/30 blur-xl pointer-events-none" />
                  <div className="relative p-3 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-[11px] font-semibold leading-tight", t.label)}>
                        {card.label}
                      </p>
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                          t.iconWrap
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className={cn("text-xl font-bold tracking-tight leading-none truncate", t.value)}>
                      {card.value}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Table View */}
          {view === "table" && (
            <div className="flex-1 min-h-0 [&_table]:text-[13px] [&_th]:text-[11px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
              <Table
                data={displayPurchaseOrders}
                columns={columns}
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPageIndex}
                loading={isLoading}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageIndex(0);
                }}
                setSorting={setSorting}
                sorting={sorting}
                pagination={true}
                emptyMessage="No purchase orders found"
                getRowClassName={(po) =>
                  po.receivedQty > 0 && po.receivedQty !== po.quantity
                    ? "!bg-red-50 hover:!bg-red-100"
                    : ""
                }
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendor-bill" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <VendorBillTab refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase Order?"
        description={
          poToDelete
            ? `Are you sure you want to delete Purchase Order "${poToDelete.poNumber}"? This action cannot be undone.`
            : "Are you sure you want to delete this purchase order?"
        }
        isDeleting={isDeleting}
      />
      <CreateVendorInvoiceDialog
        open={raiseBillOpen}
        onOpenChange={(open) => {
          setRaiseBillOpen(open);
          if (!open) {
            setRaiseBillVendorId(null);
            setRaiseBillPoIds([]);
          }
        }}
        vendors={vendors}
        initialVendorId={raiseBillVendorId}
        initialPoIds={raiseBillPoIds}
        onCreated={handleVendorBillCreated}
      />
      <DownloadPODialog
        open={downloadOpen}
        onOpenChange={(open) => {
          setDownloadOpen(open);
          if (!open) {
            setDownloadVendorId(null);
            setDownloadPoIds([]);
          }
        }}
        vendors={vendors}
        initialVendorId={downloadVendorId}
        initialPoIds={downloadPoIds}
      />
    </div>
  );
}
