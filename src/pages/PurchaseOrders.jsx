import { Plus, Search, Upload } from "lucide-react";
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
import { dummyPurchaseOrders, dummyVendors } from "@/lib/dummyData";
import { useState } from "react";

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");

  const pos = dummyPurchaseOrders.map((po) => ({
    ...po,
    vendor: dummyVendors.find((v) => v.id === po.vendorId),
  }));

  const filteredPOs = pos.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    ordered: "bg-primary/10 text-primary border-primary/20",
    received: "bg-success",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor purchase orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create PO
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by PO number or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPOs.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium">{po.poNumber}</TableCell>
                <TableCell>{po.vendor?.name}</TableCell>
                <TableCell>
                  {new Date(po.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{po.items.length} item(s)</TableCell>
                <TableCell className="text-right font-semibold">
                  ₹{po.totalAmount.toLocaleString("en-IN")}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[po.status]} variant="outline">
                    {po.status}
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




