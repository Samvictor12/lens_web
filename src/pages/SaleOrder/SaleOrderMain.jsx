import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  ShoppingCart,
  IndianRupee,
  FileEdit,
  Zap,
  Truck,
  ClipboardList,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getSaleOrders,
  getSaleOrderStats,
  deleteSaleOrder,
  getCustomersDropdown,
  getLensTypesDropdown,
  getLensCategoriesDropdown,
  getLensCoatingsDropdown,
} from "@/services/saleOrder";
import {
  saleOrderFilters,
  getIstDateString,
} from "./SaleOrder.constants";
import { SALE_ORDER_SEARCH_PLACEHOLDER } from "@/constants/saleOrderSearch";
import { useSaleOrderColumns } from "./useSaleOrderColumns";
import SaleOrderFilter from "./SaleOrderFilter";
import { Refresh } from "@/components/ui/Refresh";
import SaleOrderStatusLogDialog from "@/components/sale-order/SaleOrderStatusLogDialog";
import { buildWebSocketUrl } from "@/lib/websocketUrl";
import { cn } from "@/lib/utils";

const EMPTY_STATS = {
  totalOrders: 0,
  totalOrderValue: 0,
  pendingOrders: 0,
  urgentOrders: 0,
  readyToDispatch: 0,
  poPending: 0,
};

function formatInr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

/** Merge bar filters with clickable card quick-filter (card overrides status/urgent). */
function buildListFilters(filters, activeCard) {
  if (!activeCard || activeCard === "total" || activeCard === "value") {
    return filters;
  }
  const next = { ...filters };
  if (activeCard === "pending") {
    next.status = "DRAFT";
    next.urgentOrder = null;
  } else if (activeCard === "urgent") {
    next.urgentOrder = true;
    next.status = null;
  } else if (activeCard === "ready") {
    next.status = "READY_FOR_DISPATCH";
    next.urgentOrder = null;
  } else if (activeCard === "poPending") {
    next.status = "PO_RAISED";
    next.urgentOrder = null;
  }
  return next;
}

export default function SaleOrderMain() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);

  const [filters, setFilters] = useState(saleOrderFilters);
  const [activeCard, setActiveCard] = useState(null);

  const [saleOrders, setSaleOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [refreshKey, setRefreshKey] = useState(0);

  const [customers, setCustomers] = useState([]);
  const [lensTypes, setLensTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coatings, setCoatings] = useState([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusLogOrder, setStatusLogOrder] = useState(null);

  const handleStatusClick = (order) => setStatusLogOrder(order);
  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };
  const columns = useSaleOrderColumns(navigate, handleDeleteClick, handleStatusClick);

  const listFilters = useMemo(
    () => buildListFilters(filters, activeCard),
    [filters, activeCard]
  );

  /** First two cards stay on today IST until a date filter is applied. */
  const isTodayStatsMode = useMemo(() => {
    const hasDateFilter = Boolean(filters.startDate) || Boolean(filters.endDate);
    return !hasDateFilter;
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [custRes, typeRes, catRes, coatRes] = await Promise.all([
          getCustomersDropdown(),
          getLensTypesDropdown(),
          getLensCategoriesDropdown(),
          getLensCoatingsDropdown(),
        ]);
        if (custRes.success) setCustomers(custRes.data || []);
        if (typeRes.success) setLensTypes(typeRes.data || []);
        if (catRes.success) setCategories(catRes.data || []);
        if (coatRes.success) setCoatings(coatRes.data || []);
      } catch (error) {
        console.error("Error fetching filter dropdowns:", error);
      }
    };
    loadDropdowns();
  }, []);

  const fetchSaleOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "desc";

      const response = await getSaleOrders(
        pageIndex + 1,
        pageSize,
        searchQuery,
        listFilters,
        sortField,
        sortDirection
      );

      if (response.success) {
        setSaleOrders(response.data || []);
        setTotalCount(response.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching sale orders:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch sale orders",
        variant: "destructive",
      });
      setSaleOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, listFilters, sorting, toast]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      // Stats follow bar filters + search. Stay on today IST until start/end date is set.
      const today = getIstDateString();
      const statsFilters = isTodayStatsMode
        ? { ...filters, startDate: today, endDate: today }
        : filters;
      const response = await getSaleOrderStats(searchQuery, statsFilters);
      if (response.success) {
        setStats({ ...EMPTY_STATS, ...(response.data || {}) });
      }
    } catch (error) {
      console.error("Error fetching sale order stats:", error);
      setStats(EMPTY_STATS);
    } finally {
      setStatsLoading(false);
    }
  }, [searchQuery, filters, isTodayStatsMode]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    toast({ title: "Refreshed", description: "Sale order list has been refreshed." });
  };

  useEffect(() => {
    fetchSaleOrders();
  }, [fetchSaleOrders, refreshKey]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const fetchRef = useRef(fetchSaleOrders);
  const statsRef = useRef(fetchStats);
  useEffect(() => {
    fetchRef.current = fetchSaleOrders;
    statsRef.current = fetchStats;
  });

  useEffect(() => {
    const wsUrl = buildWebSocketUrl();
    let socket = null;
    let reconnectTimeout = null;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "SALE_ORDER_UPDATED") {
            fetchRef.current();
            statsRef.current();
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
      socket.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    try {
      setIsDeleting(true);
      await deleteSaleOrder(orderToDelete.id);
      toast({
        title: "Success",
        description: `Sale order "${orderToDelete.orderNo}" has been deleted successfully.`,
        success: true,
      });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      fetchSaleOrders();
      fetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sale order.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([, v]) => v !== null && v !== undefined && v !== "");
  }, [filters]);

  const handleFilterChange = (next) => {
    // Option B: manual status/urgent clears card quick-filter
    setActiveCard(null);
    setFilters(next);
    setPageIndex(0);
  };

  const handleClearFilters = () => {
    setFilters(saleOrderFilters);
    setActiveCard(null);
    setPageIndex(0);
  };

  const handleCardClick = (cardKey) => {
    setPageIndex(0);
    if (activeCard === cardKey) {
      setActiveCard(null);
      return;
    }
    setActiveCard(cardKey);
    // Card owns status/urgent slice (option B) — clear bar conflicts for status-based cards
    if (
      cardKey === "pending" ||
      cardKey === "ready" ||
      cardKey === "poPending" ||
      cardKey === "urgent"
    ) {
      setFilters((prev) => ({ ...prev, status: null, urgentOrder: null }));
    }
  };

  const summaryCards = [
    {
      key: "total",
      label: isTodayStatsMode ? "Today Order" : "Total Order",
      value: statsLoading ? "…" : stats.totalOrders,
      icon: ShoppingCart,
      theme: {
        card: "bg-gradient-to-br from-blue-50 to-blue-100/80 border-blue-200/80 hover:border-blue-300",
        selected: "ring-2 ring-blue-500 border-blue-400 shadow-md shadow-blue-100",
        iconWrap: "bg-blue-500 text-white shadow-sm shadow-blue-200",
        label: "text-blue-700/80",
        value: "text-blue-950",
      },
    },
    {
      key: "value",
      label: isTodayStatsMode ? "Today Order Value" : "Total Order Qty Value",
      value: statsLoading ? "…" : formatInr(stats.totalOrderValue),
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
      key: "pending",
      label: "Pending Orders",
      value: statsLoading ? "…" : stats.pendingOrders,
      icon: FileEdit,
      theme: {
        card: "bg-gradient-to-br from-slate-50 to-slate-100/90 border-slate-200 hover:border-slate-300",
        selected: "ring-2 ring-slate-500 border-slate-400 shadow-md shadow-slate-100",
        iconWrap: "bg-slate-600 text-white shadow-sm shadow-slate-200",
        label: "text-slate-600",
        value: "text-slate-900",
      },
    },
    {
      key: "urgent",
      label: "Urgent Orders",
      value: statsLoading ? "…" : stats.urgentOrders,
      icon: Zap,
      theme: {
        card: "bg-gradient-to-br from-amber-50 to-orange-100/70 border-amber-200/80 hover:border-amber-300",
        selected: "ring-2 ring-amber-500 border-amber-400 shadow-md shadow-amber-100",
        iconWrap: "bg-amber-500 text-white shadow-sm shadow-amber-200",
        label: "text-amber-800/80",
        value: "text-amber-950",
      },
    },
    {
      key: "ready",
      label: "Ready to Dispatch",
      value: statsLoading ? "…" : stats.readyToDispatch,
      icon: Truck,
      theme: {
        card: "bg-gradient-to-br from-cyan-50 to-sky-100/70 border-cyan-200/80 hover:border-cyan-300",
        selected: "ring-2 ring-cyan-500 border-cyan-400 shadow-md shadow-cyan-100",
        iconWrap: "bg-cyan-500 text-white shadow-sm shadow-cyan-200",
        label: "text-cyan-800/80",
        value: "text-cyan-950",
      },
    },
    {
      key: "poPending",
      label: "PO Pending",
      value: statsLoading ? "…" : stats.poPending,
      icon: ClipboardList,
      theme: {
        card: "bg-gradient-to-br from-indigo-50 to-violet-100/60 border-indigo-200/80 hover:border-indigo-300",
        selected: "ring-2 ring-indigo-500 border-indigo-400 shadow-md shadow-indigo-100",
        iconWrap: "bg-indigo-500 text-white shadow-sm shadow-indigo-200",
        label: "text-indigo-700/80",
        value: "text-indigo-950",
      },
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-1 sm:p-1 md:p-3",
        // Mobile: page scrolls as one unit (filters + cards + table).
        // Desktop: lock height and scroll only the table body.
        isMobile ? "min-h-0 pb-4" : "h-full min-h-0 overflow-hidden"
      )}
    >
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Sale Orders</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage all customer orders</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Refresh onClick={handleRefresh} className="shrink-0" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs shrink-0"
            onClick={handleClearFilters}
            disabled={!(hasActiveFilters || Boolean(activeCard))}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
          <Button size="xs" className="gap-1.5 h-8" asChild>
            <a href="/sales/orders/add" target="_blank" rel="noopener noreferrer">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Order</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Search + filters — share row width, no inner scroll */}
      <Card className="p-2 flex-shrink-0">
        <div className="flex w-full flex-wrap items-center gap-1.5">
          <div className="relative min-w-[160px] max-w-[280px] flex-[1.4]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={SALE_ORDER_SEARCH_PLACEHOLDER}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="pl-8 h-8 w-full text-xs"
            />
          </div>
          <SaleOrderFilter
            filters={filters}
            onChange={handleFilterChange}
            customers={customers}
            lensTypes={lensTypes}
            categories={categories}
            coatings={coatings}
          />
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 flex-shrink-0">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const selected = activeCard === card.key;
          const t = card.theme;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => handleCardClick(card.key)}
              className={[
                "group relative overflow-hidden rounded-xl border text-left transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                t.card,
                selected ? t.selected : "shadow-sm",
              ].join(" ")}
            >
              <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/30 blur-xl pointer-events-none" />
              <div className="relative p-3 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[11px] font-semibold leading-tight ${t.label}`}>
                    {card.label}
                  </p>
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.iconWrap} transition-transform group-hover:scale-105`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className={`text-xl font-bold tracking-tight leading-none truncate ${t.value}`}>
                  {card.value}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "[&_table]:text-[13px] [&_th]:text-[11px]",
          isMobile ? "w-full" : "flex-1 min-h-0"
        )}
      >
        <Table
          data={saleOrders}
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
          fillHeight={!isMobile}
          emptyMessage="No sale orders found"
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Sale Order?"
        description={
          orderToDelete
            ? `Are you sure you want to delete order "${orderToDelete.orderNo}"? This action cannot be undone.`
            : "Are you sure you want to delete this sale order?"
        }
        isDeleting={isDeleting}
      />

      <SaleOrderStatusLogDialog
        open={Boolean(statusLogOrder)}
        onOpenChange={(open) => !open && setStatusLogOrder(null)}
        orderId={statusLogOrder?.id}
        orderNo={statusLogOrder?.orderNo}
      />
    </div>
  );
}
