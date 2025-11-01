import { Plus, Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dummySaleOrders, dummyCustomers } from "@/lib/dummyData";

export default function Billing() {
  const deliveredOrders = dummySaleOrders
    .filter((order) => order.status === "delivered")
    .map((order) => ({
      ...order,
      customer: dummyCustomers.find((c) => c.id === order.customerId),
    }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Generate invoices from delivered orders
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {deliveredOrders.length === 0 ? (
          <Card className="col-span-full p-12">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Delivered Orders</h3>
              <p className="text-muted-foreground">
                Delivered orders ready for billing will appear here
              </p>
            </div>
          </Card>
        ) : (
          deliveredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{order.orderNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.customer?.name}
                    </p>
                  </div>
                  <Badge className="bg-success">
                    Delivered
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivered:</span>
                    <span className="font-medium">
                      {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold text-lg">
                      ₹{order.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  <Button size="sm" className="flex-1">
                    Create Bill
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}




