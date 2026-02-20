import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/lib/transactions";
import { getCategorySummary, getMonthlyTotals } from "@/lib/categorize";

interface Props {
  transactions: Transaction[];
}

const SpendingSummary = ({ transactions }: Props) => {
  const categories = getCategorySummary(transactions);
  const monthlyTotals = getMonthlyTotals(transactions);
  const grandTotal = categories.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions to summarize.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ category, percent }) =>
                      `${category} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {categories.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm text-foreground">{cat.category}</span>
                    <span className="text-xs text-muted-foreground">({cat.count})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">
                      ${cat.total.toFixed(2)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {((cat.total / grandTotal) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex items-center justify-between font-semibold">
                <span className="text-sm text-foreground">Total</span>
                <span className="text-sm text-foreground">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Totals */}
      {monthlyTotals.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {monthlyTotals.map((m) => (
                <div key={m.month} className="rounded-lg bg-muted px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.month + "-01").toLocaleDateString("en-AU", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-lg font-bold text-foreground">${m.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpendingSummary;
