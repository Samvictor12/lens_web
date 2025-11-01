import { Plus, Printer, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { dummySaleOrders, dummyCustomers } from "@/lib/dummyData";

export default function Dispatch() {
  const readyForDispatch = dummySaleOrders
    .filter((order) => order.status === "ready-for-dispatch")
    .map((order) => ({
      ...order,
    customer: dummyCustomers.find((c) => c.id === order.customerId),
    }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dispatch Management</h1>
          <p className="text-muted-foreground mt-1">
            Generate dispatch copies and track shipments
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Dispatch Copy
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {readyForDispatch.length === 0 ? (
          <Card className="col-span-full p-12">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Orders Ready for Dispatch</h3>
              <p className="text-muted-foreground">
                Orders will appear here once they are ready for dispatch
              </p>
            </div>
          </Card>
        ) : (
          readyForDispatch.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{order.orderNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.customer?.name}
                    </p>
                  </div>
                  <Badge className="bg-accent/10 text-accent border-accent/20" variant="outline">
                    Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium">{order.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">
                      ₹{order.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Printer className="h-3 w-3" />
                    Barcode
                  </Button>
                  <Button size="sm" className="flex-1">
                    Dispatch
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





