import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
// import { AppHeader } from "./AppHeader";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Mobile-only: 3-line control to open the sidebar sheet when it is closed. */
function MobileMenuButton() {
  const { isMobile, openMobile, toggleSidebar } = useSidebar();

  if (!isMobile || openMobile) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="fixed top-3 left-3 z-40 h-9 w-9 border bg-card shadow-sm"
      onClick={toggleSidebar}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

export const AppLayout = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-svh h-svh flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full min-w-0 h-full overflow-hidden">
          {/* Header moved into sidebar (logo top + user footer). Kept for reference.
          <AppHeader />
          */}
          <MobileMenuButton />
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col max-md:pt-12">
            <div className="max-w-[1920px] mx-auto w-full flex-1 min-h-0 overflow-y-auto flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
