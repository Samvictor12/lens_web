import { useState } from "react";
import { Download, FileText, BarChart, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventory";
import { formatCurrency, formatDate } from "@/pages/Inventory/Inventory.constants";

/**
 * Stock Value Report Modal Component
 */
function StockValueReportModal({ isOpen, onClose }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [groupBy, setGroupBy] = useState("location_id");
  const [hasSearched, setHasSearched] = useState(false);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await inventoryService.getStockValueReport({
        startDate,
        endDate,
        groupBy,
      });

      if (response.success) {
        setReportData(response.data || []);
        setHasSearched(true);
        toast({
          title: "Success",
          description: "Report generated successfully",
        });
      } else {
        throw new Error(response.message || "Failed to generate report");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!Array.isArray(reportData)) return { inwardValue: 0, outwardValue: 0 };
    return reportData.reduce(
      (acc, item) => ({
        inwardValue: (acc.inwardValue || 0) + (item.totalInwardValue || 0),
        outwardValue: (acc.outwardValue || 0) + (item.totalOutwardValue || 0),
      }),
      { inwardValue: 0, outwardValue: 0 }
    );
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Stock Value Report</CardTitle>
            <CardDescription className="mt-2">
              View inventory value movements within a date range
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="location_id">Location</option>
                <option value="lens_id">Lens Product</option>
                <option value="category_id">Category</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>

          {/* Report Results */}
          {hasSearched && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Inward Value</p>
                    <p className="text-lg font-bold text-green-600 mt-1">
                      {formatCurrency(totals.inwardValue || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Outward Value</p>
                    <p className="text-lg font-bold text-red-600 mt-1">
                      {formatCurrency(totals.outwardValue || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Report Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">
                        {groupBy === "location_id"
                          ? "Location"
                          : groupBy === "lens_id"
                          ? "Lens Product"
                          : "Category"}
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Inward Value
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Outward Value
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Net Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportData) && reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-2">
                            {row.locationName ||
                              row.lensName ||
                              row.categoryName ||
                              "Unknown"}
                          </td>
                          <td className="px-4 py-2 text-right text-green-600 font-medium">
                            {formatCurrency(row.totalInwardValue || 0)}
                          </td>
                          <td className="px-4 py-2 text-right text-red-600 font-medium">
                            {formatCurrency(row.totalOutwardValue || 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {formatCurrency(
                              (row.totalInwardValue || 0) -
                                (row.totalOutwardValue || 0)
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No data available for the selected date range
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Download Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download Excel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Reports Page — displays various business reports
 */
export default function Reports() {
  const [showStockValueReport, setShowStockValueReport] = useState(false);

  const reports = [
    {
      title: "Sales Report",
      description: "Detailed sales analysis with customer-wise breakdown",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      action: () => console.log("Coming soon: Sales Report"),
    },
    {
      title: "Inventory Report",
      description: "Current stock levels and consumed items",
      icon: BarChart,
      color: "text-accent",
      bgColor: "bg-accent/10",
      action: () => console.log("Coming soon: Inventory Report"),
    },
    {
      title: "Stock Value Report",
      description: "Track inventory value movements and trends by date range",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      action: () => setShowStockValueReport(true),
    },
    {
      title: "Financial Summary",
      description: "Monthly summary including POs, billing, and expenses",
      icon: BarChart,
      color: "text-warning",
      bgColor: "bg-warning/10",
      action: () => console.log("Coming soon: Financial Summary"),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Generate and export business reports
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div
                  className={`h-12 w-12 rounded-lg ${report.bgColor} flex items-center justify-center flex-shrink-0`}
                >
                  <report.icon className={`h-6 w-6 ${report.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle>{report.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {report.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {report.title === "Stock Value Report" ? (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={report.action}
                  >
                    View Report
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <Download className="h-3 w-3" />
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <Download className="h-3 w-3" />
                      Excel
                    </Button>
                    <Button size="sm" className="flex-1">
                      View Report
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stock Value Report Modal */}
      <StockValueReportModal
        isOpen={showStockValueReport}
        onClose={() => setShowStockValueReport(false)}
      />
    </div>
  );
}