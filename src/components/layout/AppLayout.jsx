import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";



export const AppLayout = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto">
            <div className="max-w-[1920px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};




