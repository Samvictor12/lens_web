import { Scale, CalendarDays, TrendingUp, Wallet, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroupedTrialBalanceReport from "../FinancialReports/GroupedTrialBalanceReport";
import BalanceSheetReport from "../FinancialReports/BalanceSheetReport";
import DayBookReport from "../FinancialReports/DayBookReport";
import LedgerStatementReport from "../FinancialReports/LedgerStatementReport";
import MonthlySalesReport from "../GstReports/MonthlySalesReport";
import GstCollectionReport from "../GstReports/GstCollectionReport";

export default function FinanceDashboardReportsTabs({ asOf }) {
  return (
    <Tabs defaultValue="trial">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="trial" className="gap-1.5 text-xs">
          <Scale className="h-3.5 w-3.5" /> Trial Balance
        </TabsTrigger>
        <TabsTrigger value="bs" className="gap-1.5 text-xs">
          <Scale className="h-3.5 w-3.5" /> Balance Sheet
        </TabsTrigger>
        <TabsTrigger value="daybook" className="gap-1.5 text-xs">
          <CalendarDays className="h-3.5 w-3.5" /> Day Book
        </TabsTrigger>
        <TabsTrigger value="ledger" className="gap-1.5 text-xs">
          <BookOpen className="h-3.5 w-3.5" /> Ledger
        </TabsTrigger>
        <TabsTrigger value="monthly-sales" className="gap-1.5 text-xs">
          <TrendingUp className="h-3.5 w-3.5" /> Monthly Sales
        </TabsTrigger>
        <TabsTrigger value="gst-collection" className="gap-1.5 text-xs">
          <Wallet className="h-3.5 w-3.5" /> GST Collection
        </TabsTrigger>
      </TabsList>
      <Card className="mt-3 shadow-none">
        <CardContent className="p-4 min-h-[28rem]">
          <TabsContent value="trial" className="mt-0">
            <GroupedTrialBalanceReport defaultAsOf={asOf} compact />
          </TabsContent>
          <TabsContent value="bs" className="mt-0">
            <BalanceSheetReport defaultAsOf={asOf} compact />
          </TabsContent>
          <TabsContent value="daybook" className="mt-0">
            <DayBookReport defaultDate={asOf} compact />
          </TabsContent>
          <TabsContent value="ledger" className="mt-0">
            <LedgerStatementReport defaultAsOf={asOf} compact />
          </TabsContent>
          <TabsContent value="monthly-sales" className="mt-0">
            <MonthlySalesReport />
          </TabsContent>
          <TabsContent value="gst-collection" className="mt-0">
            <GstCollectionReport />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
