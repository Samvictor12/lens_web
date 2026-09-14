import { Scale, CalendarDays, BookOpen, Landmark, Receipt, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroupedTrialBalanceReport from "../FinancialReports/GroupedTrialBalanceReport";
import BalanceSheetReport from "../FinancialReports/BalanceSheetReport";
import ProfitLossReport from "../FinancialReports/ProfitLossReport";
import DayBookReport from "../FinancialReports/DayBookReport";
import LedgerStatementReport from "../FinancialReports/LedgerStatementReport";
import CashBankAccountsTab from "./CashBankAccountsTab";
import GstInvoiceRegisterReport from "../GstReports/GstInvoiceRegisterReport";

export default function FinanceDashboardReportsTabs({ asOf, tab, onTabChange }) {
  return (
    <Tabs value={tab} onValueChange={onTabChange} defaultValue="trial">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="trial" className="gap-1.5 text-xs">
          <Scale className="h-3.5 w-3.5" /> Trial Balance
        </TabsTrigger>
        <TabsTrigger value="bs" className="gap-1.5 text-xs">
          <Scale className="h-3.5 w-3.5" /> Balance Sheet
        </TabsTrigger>
        <TabsTrigger value="pnl" className="gap-1.5 text-xs">
          <Wallet className="h-3.5 w-3.5" /> Profit &amp; Loss
        </TabsTrigger>
        <TabsTrigger value="daybook" className="gap-1.5 text-xs">
          <CalendarDays className="h-3.5 w-3.5" /> Day Book
        </TabsTrigger>
        <TabsTrigger value="ledger" className="gap-1.5 text-xs">
          <BookOpen className="h-3.5 w-3.5" /> General Ledger
        </TabsTrigger>
        <TabsTrigger value="cash-bank" className="gap-1.5 text-xs">
          <Landmark className="h-3.5 w-3.5" /> Cash &amp; Bank
        </TabsTrigger>
        <TabsTrigger value="gst" className="gap-1.5 text-xs">
          <Receipt className="h-3.5 w-3.5" /> GST Report
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
          <TabsContent value="pnl" className="mt-0">
            <ProfitLossReport defaultAsOf={asOf} compact />
          </TabsContent>
          <TabsContent value="daybook" className="mt-0">
            <DayBookReport defaultDate={asOf} compact />
          </TabsContent>
          <TabsContent value="ledger" className="mt-0">
            <LedgerStatementReport defaultAsOf={asOf} compact />
          </TabsContent>
          <TabsContent value="cash-bank" className="mt-0">
            <CashBankAccountsTab />
          </TabsContent>
          <TabsContent value="gst" className="mt-0">
            <GstInvoiceRegisterReport />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
