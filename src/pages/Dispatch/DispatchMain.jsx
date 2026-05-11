import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, PackageCheck, List } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DispatchDashboard from "./components/DispatchDashboard";
import ReadyForDispatch from "./components/ReadyForDispatch";
import DispatchList from "./components/DispatchList";

export default function DispatchMain() {
    const { user } = useAuth();
    const isDeliveryPerson = user?.roleName === "Delivery Person";

    const [activeTab, setActiveTab] = useState("dashboard");
    // Shared refresh keys so tab data refreshes after actions
    const [readyRefreshKey, setReadyRefreshKey] = useState(0);
    const [listRefreshKey, setListRefreshKey] = useState(0);
    const [dashRefreshKey, setDashRefreshKey] = useState(0);

    const refreshAll = () => {
        setReadyRefreshKey((k) => k + 1);
        setListRefreshKey((k) => k + 1);
        setDashRefreshKey((k) => k + 1);
    };

    return (
        <div className="flex flex-col h-full p-2 md:p-4 gap-3 w-full">
            {/* Page Header */}
            <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Dispatch Management</h1>
                <p className="text-xs text-muted-foreground">
                    {isDeliveryPerson
                        ? "Manage your assigned deliveries"
                        : "Track and manage all orders and deliveries"}
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
                <TabsList className="grid grid-cols-3 w-full h-9 shrink-0">
                    <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Dashboard</span>
                        <span className="sm:hidden">Home</span>
                    </TabsTrigger>
                    <TabsTrigger value="ready" className="gap-1.5 text-xs sm:text-sm">
                        <PackageCheck className="h-3.5 w-3.5" />
                        <span>Ready</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-1.5 text-xs sm:text-sm">
                        <List className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Dispatch List</span>
                        <span className="sm:hidden">List</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="flex-1 mt-3 min-h-0">
                    <DispatchDashboard
                        refreshKey={dashRefreshKey}
                        onNavigate={setActiveTab}
                    />
                </TabsContent>

                <TabsContent value="ready" className="flex-1 mt-3 min-h-0">
                    <ReadyForDispatch
                        refreshKey={readyRefreshKey}
                        onDispatchCreated={refreshAll}
                        isDeliveryPerson={isDeliveryPerson}
                        user={user}
                    />
                </TabsContent>

                <TabsContent value="list" className="flex-1 mt-3 min-h-0">
                    <DispatchList
                        refreshKey={listRefreshKey}
                        onStatusUpdated={refreshAll}
                        isDeliveryPerson={isDeliveryPerson}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

