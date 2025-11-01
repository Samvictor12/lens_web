import { Download, FileText, BarChart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
  const reports = [
    {
      title: "Sales Report",
      description: "Detailed sales analysis with customer-wise breakdown",
      icon,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Inventory Report",
      description: "Current stock levels and consumed items",
      icon,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Financial Summary",
      description: "Monthly summary including POs, billing, and expenses",
      icon,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Purchase Orders",
      description: "PO status and vendor-wise spending",
      icon,
      color: "text-warning",
      bgColor: "bg-warning/10",
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
                <div className={`h-12 w-12 rounded-lg ${report.bgColor} flex items-center justify-center flex-shrink-0`}>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}



