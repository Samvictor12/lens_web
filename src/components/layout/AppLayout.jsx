import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";



export const AppLayout = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full min-w-0 h-full overflow-hidden">
          <AppHeader />
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="max-w-[1920px] mx-auto w-full flex-1 min-h-0 overflow-y-auto flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};




