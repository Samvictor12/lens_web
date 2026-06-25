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
          <main className="flex-1 overflow-y-auto min-h-0">
            <div className="max-w-[1920px] mx-auto min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};




