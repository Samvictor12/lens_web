import { Plus, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dummyExpenses } from "@/lib/dummyData";

export default function Expenses() {
  const totalDirect = dummyExpenses
    .filter((e) => e.type === "direct")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIndirect = dummyExpenses
    .filter((e) => e.type === "indirect")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground mt-1">
            Track direct and indirect expenses
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{(totalDirect + totalIndirect).toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Direct Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              ₹{totalDirect.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Indirect Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">
              ₹{totalIndirect.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dummyExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  {new Date(expense.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-medium">{expense.category}</TableCell>
                <TableCell className="text-muted-foreground">
                  {expense.description}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      expense.type === "direct"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-accent/10 text-accent border-accent/20"
                    }
                  >
                    {expense.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ₹{expense.amount.toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}


