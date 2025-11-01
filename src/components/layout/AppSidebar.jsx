import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  DollarSign,
  BarChart3,
  Settings,
  Users,
  Building,
  Eye,
  Tag,
  FolderOpen,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
// import { UserRole } from "@/types";



const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "sales", "inventory", "accounts"],
  },
  {
    title: "Sale Orders",
    url: "/sales/orders",
    icon: ShoppingCart,
    allowedRoles: ["admin", "sales"],
  },
  {
    title: "Customers",
    url: "/sales/customers",
    icon: Users,
    allowedRoles: ["admin", "sales", "accounts"],
  },
  {
    title: "Inventory",
    url: "/inventory/stock",
    icon: Package,
    allowedRoles: ["admin", "inventory"],
  },
  {
    title: "Purchase Orders",
    url: "/inventory/purchase-orders",
    icon: Receipt,
    allowedRoles: ["admin", "inventory"],
  },
  {
    title: "Dispatch",
    url: "/dispatch",
    icon: Truck,
    allowedRoles: ["admin", "sales", "inventory"],
  },
  {
    title: "Billing",
    url: "/billing",
    icon: Receipt,
    allowedRoles: ["admin", "accounts"],
  },
  {
    title: "Payments",
    url: "/accounts/payments",
    icon: DollarSign,
    allowedRoles: ["admin", "accounts"],
  },
  {
    title: "Expenses",
    url: "/accounts/expenses",
    icon: DollarSign,
    allowedRoles: ["admin", "accounts"],
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    allowedRoles: ["admin", "accounts"],
  },
];

const masterItems = [
  {
    title: "Vendors",
    url: "/masters/vendors",
    icon: Building,
    allowedRoles: ["admin", "inventory"],
  },
  {
    title: "Lens Types",
    url: "/masters/lens-types",
    icon: Eye,
    allowedRoles: ["admin", "inventory"],
  },
  {
    title: "Price Mapping",
    url: "/masters/price-mapping",
    icon: Tag,
    allowedRoles: ["admin", "sales"],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    allowedRoles: ["admin"],
  },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const isActive = (path) => location.pathname === path;

  const filteredNavItems = navItems.filter((item) =>
    hasPermission(item.allowedRoles)
  );

  const filteredMasterItems = masterItems.filter((item) =>
    hasPermission(item.allowedRoles)
  );

  return (
    <TooltipProvider>
      <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className={state === "collapsed" ? "hidden" : ""}>
              Main Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNavItems.map((item) => (
                  <SidebarMenuItem key={item.title} className={isActive(item.url) ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={({ isActive }) =>
                              isActive
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
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {filteredMasterItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className={state === "collapsed" ? "hidden" : ""}>
                Masters
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredMasterItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={({ isActive }) =>
                                isActive
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
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
};




