import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dummySaleOrders, dummyCustomers } from "@/lib/dummyData";

export default function SaleOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const orders = dummySaleOrders.map((order) => ({
    ...order,
    customer: dummyCustomers.find((c) => c.id === order.customerId),
  }));

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    "in-production": "bg-primary/10 text-primary border-primary/20",
    "ready-for-dispatch": "bg-accent/10 text-accent border-accent/20",
    dispatched: "bg-success/10 text-success border-success/20",
    delivered: "bg-success",
    returned: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const handleCreateNewOrder = () => {
    navigate("/sales/orders/new");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sale Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage all customer orders
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreateNewOrder}>
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{order.customer?.name}</TableCell>
                <TableCell>
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{order.items.length} item(s)</TableCell>
                <TableCell className="text-right font-semibold">
                  ₹{order.totalAmount.toLocaleString("en-IN")}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[order.status]} variant="outline">
                    {order.status.replace(/-/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}





