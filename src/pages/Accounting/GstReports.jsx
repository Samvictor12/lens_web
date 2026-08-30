import { useNavigate } from "react-router-dom";
import { Receipt, TrendingUp, Wallet, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthlySalesReport from "./GstReports/MonthlySalesReport";
import GstCollectionReport from "./GstReports/GstCollectionReport";

export default function GstReports() {
  const navigate = useNavigate();

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            GST Reports
          </h1>
          <p className="text-xs text-muted-foreground">Monthly Sales Report and GST Collection Report for filing</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/accounts/finance-dashboard")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Finance Dashboard
        </Button>
      </div>

      <Tabs defaultValue="monthly-sales">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="monthly-sales" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Monthly Sales Report
          </TabsTrigger>
          <TabsTrigger value="gst-collection" className="gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" /> GST Collection Report
          </TabsTrigger>
        </TabsList>
        <Card className="mt-3">
          <CardContent className="p-4">
            <TabsContent value="monthly-sales" className="mt-0">
              <MonthlySalesReport />
            </TabsContent>
            <TabsContent value="gst-collection" className="mt-0">
              <GstCollectionReport />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
