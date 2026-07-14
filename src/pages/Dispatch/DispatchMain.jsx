import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Refresh } from "@/components/ui/Refresh";
import { useToast } from "@/hooks/use-toast";
import DispatchDashboard from "./components/DispatchDashboard";
import ReadyForDispatch from "./components/ReadyForDispatch";
import DispatchList from "./components/DispatchList";

export default function DispatchMain() {
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState("dashboard");
    const [readyRefreshKey, setReadyRefreshKey] = useState(0);
    const [listRefreshKey, setListRefreshKey] = useState(0);
    const [dashRefreshKey, setDashRefreshKey] = useState(0);

    const refreshAll = () => {
        setReadyRefreshKey((k) => k + 1);
        setListRefreshKey((k) => k + 1);
        setDashRefreshKey((k) => k + 1);
    };

    const handleRefresh = () => {
        if (activeTab === "dashboard") setDashRefreshKey((k) => k + 1);
        else if (activeTab === "ready") setReadyRefreshKey((k) => k + 1);
        else if (activeTab === "list") setListRefreshKey((k) => k + 1);
        toast({
            title: "Refreshed",
            description: "Dispatch data has been refreshed.",
        });
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Dispatch Management</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Track and manage all orders and deliveries
                    </p>
                </div>
                <Refresh onClick={handleRefresh} />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <TabsList className="grid grid-cols-3 mb-4 flex-shrink-0">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="ready">Ready for Dispatch</TabsTrigger>
                    <TabsTrigger value="list">Dispatch List</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
                    <DispatchDashboard
                        refreshKey={dashRefreshKey}
                        onNavigate={setActiveTab}
                    />
                </TabsContent>

                <TabsContent value="ready" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
                    <ReadyForDispatch
                        refreshKey={readyRefreshKey}
                        onDispatchCreated={refreshAll}
                    />
                </TabsContent>

                <TabsContent value="list" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
                    <DispatchList
                        refreshKey={listRefreshKey}
                        onStatusUpdated={refreshAll}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
