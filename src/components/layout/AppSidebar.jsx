import * as React from "react";
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
  Briefcase,
  UserCog,
  Layers,
  Sparkles,
  Award,
  Grid,
  ChevronRight,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
// import { UserRole } from "@/types";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    // allowedRoles: ["admin", "sales", "inventory", "accounts"],
  },
  {
    title: "Sale Orders",
    url: "/sales/orders",
    icon: ShoppingCart,
    // allowedRoles: ["admin", "sales"],
  },

  {
    title: "Inventory",
    url: "/inventory/stock",
    icon: Package,
    // allowedRoles: ["admin", "inventory"],
  },
  {
    title: "Purchase Orders",
    url: "/inventory/purchase-orders",
    icon: Receipt,
    // allowedRoles: ["admin", "inventory"],
  },
  {
    title: "Dispatch",
    url: "/dispatch",
    icon: Truck,
    // allowedRoles: ["admin", "sales", "inventory"],
  },
  {
    title: "Billing",
    url: "/billing",
    icon: Receipt,
    // allowedRoles: ["admin", "accounts"],
  },
  {
    title: "Payments",
    url: "/accounts/payments",
    icon: DollarSign,
    // allowedRoles: ["admin", "accounts"],
  },
  {
    title: "Expenses",
    url: "/accounts/expenses",
    icon: DollarSign,
    // allowedRoles: ["admin", "accounts"],
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    // allowedRoles: ["admin", "accounts"],
  },
];

const masterItems = [
  {
    title: "Customers",
    url: "/sales/customers",
    icon: Users,
    // allowedRoles: ["admin", "sales", "accounts"],
  },
  {
    title: "Vendors",
    url: "/masters/vendors",
    icon: Building,
    // allowedRoles: ["admin", "inventory"],
  },
  {
    title: "Business Categories",
    url: "/masters/business-categories",
    icon: Tag,
    // allowedRoles: ["admin", "sales"],
  },
  {
    title: "Lens Masters",
    icon: Package,
    // allowedRoles: ["admin", "inventory"],
    subItems: [
      {
        title: "Lens Categories",
        url: "/masters/lens-category",
        icon: Layers,
      },
      {
        title: "Lens Materials",
        url: "/masters/lens-material",
        icon: Package,
      },
      {
        title: "Lens Coatings",
        url: "/masters/lens-coating",
        icon: Sparkles,
      },
      {
        title: "Lens Brands",
        url: "/masters/lens-brand",
        icon: Award,
      },
      {
        title: "Lens Types",
        url: "/masters/lens-type",
        icon: Grid,
      },
    ],
  },
  {
    title: "Departments",
    url: "/masters/departments",
    icon: Briefcase,
    // allowedRoles: ["admin"],
  },
  {
    title: "Users",
    url: "/masters/users",
    icon: UserCog,
    // allowedRoles: ["admin"],
  },
  {
    title: "Price Mapping",
    url: "/masters/price-mapping",
    icon: Tag,
    // allowedRoles: ["admin", "sales"],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    // allowedRoles: ["admin"],
  },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [openSubmenus, setOpenSubmenus] = React.useState({});

  const isActive = (path) => location.pathname === path;
  
  const toggleSubmenu = (title) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const isSubmenuActive = (subItems) => {
    return subItems?.some(item => location.pathname.startsWith(item.url));
  };

  // ROLE ACCESS DISABLED - Show all items for now
  // const filteredNavItems = navItems.filter((item) =>
  //   hasPermission(item.allowedRoles)
  // );
  const filteredNavItems = navItems;

  // const filteredMasterItems = masterItems.filter((item) =>
  //   hasPermission(item.allowedRoles)
  // );
  const filteredMasterItems = masterItems;

  return (
    <TooltipProvider>
      <Sidebar
        className={state === "collapsed" ? "w-14" : "w-64"}
        collapsible="icon"
      >
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
                  <SidebarMenuItem
                    key={item.title}
                    className={
                      isActive(item.url)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : ""
                    }
                  >
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
              <SidebarGroupLabel
                className={state === "collapsed" ? "hidden" : ""}
              >
                Masters
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredMasterItems.map((item) => (
                    <React.Fragment key={item.title}>
                      {item.subItems ? (
                        <Collapsible.Root
                          open={openSubmenus[item.title] || isSubmenuActive(item.subItems)}
                          onOpenChange={() => toggleSubmenu(item.title)}
                        >
                          <SidebarMenuItem>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Collapsible.Trigger asChild>
                                  <SidebarMenuButton
                                    className={isSubmenuActive(item.subItems) ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                                  >
                                    <item.icon className="h-4 w-4" />
                                    {state !== "collapsed" && (
                                      <>
                                        <span>{item.title}</span>
                                        <ChevronRight
                                          className={`ml-auto h-4 w-4 transition-transform ${
                                            openSubmenus[item.title] || isSubmenuActive(item.subItems) ? "rotate-90" : ""
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
                                        <span className="text-sm">{subItem.title}</span>
                                      </NavLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </SidebarMenu>
                            )}
                          </Collapsible.Content>
                        </Collapsible.Root>
                      ) : (
                        <SidebarMenuItem>
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
      </Sidebar>
    </TooltipProvider>
  );
};
