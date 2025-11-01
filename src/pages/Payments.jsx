import { Plus, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dummyCustomers } from "@/lib/dummyData";

export default function Payments() {
  const customersWithBalance = dummyCustomers.filter(
    (c) => c.outstandingBalance > 0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground mt-1">
            Record and track customer payments
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              ₹
              {dummyCustomers
                .reduce((sum, c) => sum + c.outstandingBalance, 0)
                .toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Customers with Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customersWithBalance.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {customersWithBalance.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{customer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {customer.phone}
                  </p>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Outstanding:</span>
                <span className="text-xl font-bold text-warning">
                  ₹{customer.outstandingBalance.toLocaleString("en-IN")}
                </span>
              </div>
              <Button size="sm" className="w-full gap-2">
                <CreditCard className="h-3 w-3" />
                Record Payment
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


