import * as React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  Users,
  Building,
  Eye,
  Tag,
  FolderOpen,
  Briefcase,
  UserCog,
  Layers,
  Sparkles,
  Award,
  Grid,
  ChevronRight,
  Wrench,
  Warehouse,
  MapPin,
  Box,
  ClipboardCheck,
  Activity,
  BookOpen,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Building2,
  RefreshCw,
  Scale,
  Circle,
  LogOut,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useRolePermissionsContext } from "@/contexts/RolePermissionsContext";
import { SettingsModal } from "@/pages/Settings/SettingsModal";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    key: "dashboard",
  },
  {
    title: "Sale Orders",
    url: "/sales/orders",
    icon: ShoppingCart,
    key: "sale_orders",
  },
  {
    title: "Purchase Orders",
    url: "/masters/purchase-orders",
    icon: Receipt,
    key: "purchase_orders",
  },
  {
    title: "Inventory",
    url: "/inventory/stock/dashboard",
    icon: Package,
    key: "inventory",
    activePrefix: "/inventory",
  },
  {
    title: "Live Tracking",
    url: "/live-tracking",
    icon: Activity,
    key: "live_tracking",
  },
  {
    title: "Pre-QC",
    url: "/pre-qc/operator",
    icon: ClipboardCheck,
    key: "pre_qc",
  },
  {
    title: "Fitting",
    url: "/fitting/operator",
    icon: Wrench,
    key: "fitting",
  },
  
  {
    title: "Post-QC",
    url: "/quality/operator",
    icon: ClipboardCheck,
    key: "post_qc",
  },
  {
    title: "Dispatch",
    url: "/dispatch",
    icon: Truck,
    key: "dispatch",
  },
  {
    title: "Dispatch Window",
    url: "/dispatch/window",
    icon: Package,
    key: "dispatch_window",
  },  
  {
    title: "Accounting",
    icon: BookOpen,
    subItems: [
      { title: "Customer 360", url: "/accounts/customer-360", icon: Users, key: "customers" },
      { title: "Billing and invoicing", url: "/accounts/billing-and-invoicing", icon: Receipt, key: "billing" },
      { title: "Vendor Bill & Expenses", url: "/accounts/vendor-payments", icon: CreditCard, key: "vendor_payments" },
      { title: "Income and loans", url: "/accounts/income", icon: TrendingUp, key: "income" },
      { title: "Chart of Accounts", url: "/accounts/ledgers", icon: BookOpen, key: "chart_of_accounts" },
      { title: "Bank Accounts", url: "/accounts/bank-accounts", icon: Building2, key: "bank_accounts" },
      // { title: "Expenses", url: "/accounts/expenses", icon: TrendingDown, key: "expenses" },
      { title: "Bank Reconciliation", url: "/accounts/bank-reconciliation", icon: RefreshCw, key: "bank_reconciliation" },
      { title: "Financial Reports", url: "/accounts/reports", icon: Scale, key: "financial_reports" },
    ],
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    key: "reports",
  },
];

const masterItems = [
  {
    title: "Business Categories",
    url: "/masters/business-categories",
    icon: Tag,
    key: "business_categories",
  },
  {
    title: "Expense Categories",
    url: "/masters/expense-categories",
    icon: Tag,
    key: "expense_categories",
  },
  {
    title: "Income Categories",
    url: "/masters/income-categories",
    icon: Tag,
    key: "income_categories",
  },
  {
    title: "Customers",
    url: "/sales/customers",
    icon: Users,
    key: "customers",
  },
  {
    title: "Vendors",
    url: "/masters/vendors",
    icon: Building,
    key: "vendors",
  },
  {
    title: "Admin Masters",
    icon: Eye,
    subItems: [
      {
        title: "Departments",
        url: "/masters/departments",
        icon: Briefcase,
        key: "departments",
      },
      {
        title: "Users",
        url: "/masters/users",
        icon: UserCog,
        key: "users",
      },
      {
        title: "Roles",
        url: "/masters/roles",
        icon: UserCog,
        key: "users",
      },
      {
        title: "Check Sheets",
        url: "/masters/check-sheets",
        icon: ClipboardCheck,
        key: "check_sheets",
      },
    ],
  },
  {
    title: "Lens Masters",
    icon: Package,
    subItems: [
      {
        title: "Lens Indexes",
        url: "/masters/lens-index",
        icon: Grid,
        key: "lens_indexes",
      },
      {
        title: "Lens Diameters",
        url: "/masters/lens-dia",
        icon: Circle,
        key: "lens_diameters",
      },
      {
        title: "Lens Categories",
        url: "/masters/lens-category",
        icon: Layers,
        key: "lens_categories",
      },
      {
        title: "Lens Materials",
        url: "/masters/lens-material",
        icon: Package,
        key: "lens_materials",
      },
      {
        title: "Lens Coatings",
        url: "/masters/lens-coating",
        icon: Sparkles,
        key: "lens_coatings",
      },
      {
        title: "Lens Tinting",
        url: "/masters/lens-tinting",
        icon: Sparkles,
        key: "lens_tintings",
      },
      {
        title: "Lens Fittings",
        url: "/masters/lens-fitting",
        icon: Wrench,
        key: "lens_fittings",
      },
      {
        title: "Lens Brands",
        url: "/masters/lens-brand",
        icon: Award,
        key: "lens_brands",
      },
      {
        title: "Lens Types",
        url: "/masters/lens-type",
        icon: Grid,
        key: "lens_types",
      },
      {
        title: "Lens Products",
        url: "/masters/lens-product",
        icon: Package,
        key: "lens_products",
      },
      {
        title: "Lens Offers",
        url: "/masters/lens-offers",
        icon: Tag,
        key: "lens_offers",
      },
    ],
  },
  {
    title: "Inventory Masters",
    icon: Warehouse,
    subItems: [
      {
        title: "Locations",
        url: "/masters/location",
        icon: MapPin,
        key: "locations",
      },
      {
        title: "Bins",
        url: "/masters/tray",
        icon: Box,
        key: "trays",
      },
      {
        title: "Tray",
        url: "/masters/location-tray",
        icon: Box,
        key: "location_trays",
      },
    ],
  },
  {
    title: "Price Mapping",
    url: "/masters/price-mapping",
    icon: Tag,
    key: "price_mapping",
  },
];

export const AppSidebar = () => {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { company } = useCompany();
  const { has, loading } = useRolePermissionsContext();
  const [openSubmenus, setOpenSubmenus] = React.useState({});
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState("profile");

  const isCollapsed = state === "collapsed" && !isMobile;
  const appInitial =
    (company?.companyName || "Lens").trim().charAt(0).toUpperCase() || "L";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openSettings = (tab = "profile") => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  const toggleSubmenu = (title) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const isSubmenuActive = (subItems) => {
    return subItems?.some((item) => location.pathname.startsWith(item.url));
  };

  const isNavItemActive = (item) => {
    if (item.activePrefix) {
      return location.pathname.startsWith(item.activePrefix);
    }
    if (item.subItems) {
      return isSubmenuActive(item.subItems);
    }
    return item.url ? location.pathname.startsWith(item.url) : false;
  };

  const filterItems = React.useCallback((items) => {
    return items
      .map((item) => {
        if (item.subItems) {
          const filteredSub = filterItems(item.subItems);
          if (filteredSub.length > 0) {
            return { ...item, subItems: filteredSub };
          }
          return null;
        }
        
        // Leaf item validation
        if (item.key && !has(item.key, "Screen")) {
          return null;
        }
        return item;
      })
      .filter(Boolean);
  }, [has]);

  const filteredNavItems = React.useMemo(() => {
    if (loading) return [];
    return filterItems(navItems);
  }, [loading, filterItems]);

  const filteredMasterItems = React.useMemo(() => {
    if (loading) return [];
    return filterItems(masterItems);
  }, [loading, filterItems]);

  const isMasterActive = filteredMasterItems.some(item => {
    if (item.subItems) {
      return item.subItems.some(sub => location.pathname.startsWith(sub.url));
    }
    return location.pathname.startsWith(item.url);
  });

  const isNavActive = filteredNavItems.some((item) => isNavItemActive(item));

  return (
    <TooltipProvider>
      <Sidebar
        className={state === "collapsed" ? "w-14" : "w-64"}
        collapsible="icon"
      >
        <SidebarHeader className="border-b border-sidebar-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                className={`flex w-full items-center justify-center rounded-md outline-none transition-all hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                  isCollapsed ? "h-10 p-0" : "min-h-[4.5rem] px-3 py-3"
                }`}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {company?.logo ? (
                  <img
                    src={company.logo}
                    alt="Logo"
                    className={`object-contain transition-all ${
                      isCollapsed
                        ? "h-4 w-4"
                        : "h-14 w-full max-w-full"
                    }`}
                  />
                ) : (
                  <div
                    className={`flex items-center justify-center rounded bg-primary font-semibold text-primary-foreground transition-all ${
                      isCollapsed
                        ? "h-4 w-4 text-[10px]"
                        : "h-14 w-full text-2xl"
                    }`}
                  >
                    {appInitial}
                  </div>
                )}
              </button>
            </TooltipTrigger>
            {!isMobile && (
              <TooltipContent side="right" className="ml-2">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            )}
          </Tooltip>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel
              className={state === "collapsed" ? "hidden" : ""}
            >
              Main Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNavItems.map((item) => (
                  <React.Fragment key={item.title}>
                    {item.subItems ? (
                      <Collapsible.Root
                        open={
                          openSubmenus[item.title] ||
                          isSubmenuActive(item.subItems)
                        }
                        onOpenChange={() => toggleSubmenu(item.title)}
                      >
                        <SidebarMenuItem>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Collapsible.Trigger asChild>
                                <SidebarMenuButton
                                  className={
                                    isSubmenuActive(item.subItems)
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : ""
                                  }
                                >
                                  <item.icon className="h-4 w-4" />
                                  {state !== "collapsed" && (
                                    <>
                                      <span>{item.title}</span>
                                      <ChevronRight
                                        className={`ml-auto h-4 w-4 transition-transform ${
                                          openSubmenus[item.title] ||
                                          isSubmenuActive(item.subItems)
                                            ? "rotate-90"
                                            : ""
                                        }`}
                                      />
                                    </>
                                  )}
                                </SidebarMenuButton>
                              </Collapsible.Trigger>
                            </TooltipTrigger>
                            {state === "collapsed" && (
                              <TooltipContent side="right" className="ml-2">
                                {item.title}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </SidebarMenuItem>

                        <Collapsible.Content>
                          {state !== "collapsed" && (
                            <SidebarMenu className="ml-4 border-l pl-2">
                              {item.subItems.map((subItem) => (
                                <SidebarMenuItem key={subItem.title}>
                                  <SidebarMenuButton asChild>
                                    <NavLink
                                      to={subItem.url}
                                      className={({ isActive }) =>
                                        isActive
                                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                          : "hover:bg-sidebar-accent/50"
                                      }
                                    >
                                      <subItem.icon className="h-3.5 w-3.5" />
                                      <span className="text-sm">
                                        {subItem.title}
                                      </span>
                                    </NavLink>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              ))}
                            </SidebarMenu>
                          )}
                        </Collapsible.Content>
                      </Collapsible.Root>
                    ) : (
                      <SidebarMenuItem
                        key={item.title}
                        className={
                          isNavItemActive(item)
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : ""
                        }
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                className={() =>
                                  isNavItemActive(item)
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                    : "hover:bg-sidebar-accent/50"
                                }
                              >
                                <item.icon className="h-4 w-4" />
                                {state !== "collapsed" && <span>{item.title}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          {state === "collapsed" && (
                            <TooltipContent side="right" className="ml-2">
                              {item.title}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </SidebarMenuItem>
                    )}
                  </React.Fragment>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {filteredMasterItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel
                className={
                  state === "collapsed"
                    ? "hidden"
                    : isMasterActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : ""
                }
              >
                Masters
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredMasterItems.map((item) => (
                    <React.Fragment key={item.title}>
                      {item.subItems ? (
                        <Collapsible.Root
                          open={
                            openSubmenus[item.title] ||
                            isSubmenuActive(item.subItems)
                          }
                          onOpenChange={() => toggleSubmenu(item.title)}
                        >
                          <SidebarMenuItem>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Collapsible.Trigger asChild>
                                  <SidebarMenuButton
                                    className={
                                      isSubmenuActive(item.subItems)
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                        : ""
                                    }
                                  >
                                    <item.icon className="h-4 w-4" />
                                    {state !== "collapsed" && (
                                      <>
                                        <span>{item.title}</span>
                                        <ChevronRight
                                          className={`ml-auto h-4 w-4 transition-transform ${
                                            openSubmenus[item.title] ||
                                            isSubmenuActive(item.subItems)
                                              ? "rotate-90"
                                              : ""
                                          }`}
                                        />
                                      </>
                                    )}
                                  </SidebarMenuButton>
                                </Collapsible.Trigger>
                              </TooltipTrigger>
                              {state === "collapsed" && (
                                <TooltipContent side="right" className="ml-2">
                                  {item.title}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </SidebarMenuItem>

                          <Collapsible.Content>
                            {state !== "collapsed" && (
                              <SidebarMenu className="ml-4 border-l pl-2">
                                {item.subItems.map((subItem) => (
                                  <SidebarMenuItem key={subItem.title}>
                                    <SidebarMenuButton asChild>
                                      <NavLink
                                        to={subItem.url}
                                        className={({ isActive }) =>
                                          isActive
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                            : "hover:bg-sidebar-accent/50"
                                        }
                                      >
                                        <subItem.icon className="h-3.5 w-3.5" />
                                        <span className="text-sm">
                                          {subItem.title}
                                        </span>
                                      </NavLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </SidebarMenu>
                            )}
                          </Collapsible.Content>
                        </Collapsible.Root>
                      ) : (
                        <SidebarMenuItem
                          key={item.title}
                          className={
                            isNavItemActive(item)
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : ""
                          }
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={item.url}
                                  className={() =>
                                    isNavItemActive(item)
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : "hover:bg-sidebar-accent/50"
                                  }
                                >
                                  <item.icon className="h-4 w-4" />
                                  {state !== "collapsed" && (
                                    <span>{item.title}</span>
                                  )}
                                </NavLink>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            {state === "collapsed" && (
                              <TooltipContent side="right" className="ml-2">
                                {item.title}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </SidebarMenuItem>
                      )}
                    </React.Fragment>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className={`w-full hover:bg-sidebar-accent/50 ${
                  isCollapsed
                    ? "h-10 justify-center px-0"
                    : "h-auto justify-start gap-2 px-2 py-2"
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0 text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                {!isCollapsed && (
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize truncate">
                      {user?.roleName || "User"}
                    </p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isMobile ? "top" : "right"}
              align="end"
              className="w-56"
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openSettings("profile")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsTab}
      />
    </TooltipProvider>
  );
};
