import { Plus, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dummyLensVariants, dummyLensTypes } from "@/lib/dummyData";
import { useState } from "react";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");

  const inventory = dummyLensVariants.map((variant) => ({
    ...variant,
    lensType: dummyLensTypes.find((lt) => lt.id === variant.lensTypeId),
  }));

  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lensType?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage stock levels
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU, name, or lens type..."
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
              <TableHead>SKU</TableHead>
              <TableHead>Lens Type</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Reorder Level</TableHead>
              <TableHead className="text-right">Cost Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell>{item.lensType?.name}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-right font-semibold">
                  {item.stockQuantity}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.reorderLevel}
                </TableCell>
                <TableCell className="text-right">
                  ₹{item.costPrice.toLocaleString("en-IN")}
                </TableCell>
                <TableCell>
                  {item.stockQuantity <= item.reorderLevel ? (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Low Stock
                    </Badge>
                  ) : (
                    <Badge className="bg-success/10 text-success border-success/20" variant="outline">
                      In Stock
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}



