import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { Transaction } from "@/lib/transactions";
import { detectOvercharges } from "@/lib/overcharge-detector";
import { categorizeTransaction } from "@/lib/categorize";
import { useMemo } from "react";

const CATEGORY_BG: Record<string, string> = {
  "Meals & Food": "bg-orange-100 dark:bg-orange-900/30",
  "Housing & Accommodation": "bg-blue-100 dark:bg-blue-900/30",
  "Transport": "bg-purple-100 dark:bg-purple-900/30",
  "Personal Care": "bg-sky-100 dark:bg-sky-900/30",
  "Health & Medical": "bg-pink-100 dark:bg-pink-900/30",
  "Community & Social": "bg-teal-100 dark:bg-teal-900/30",
  "Support Worker": "bg-indigo-100 dark:bg-indigo-900/30",
  "Fees & Admin": "bg-yellow-100 dark:bg-yellow-900/30",
  "Equipment & Supplies": "bg-violet-100 dark:bg-violet-900/30",
  "Other": "",
};

const CATEGORY_DOT: Record<string, string> = {
  "Meals & Food": "bg-orange-500",
  "Housing & Accommodation": "bg-blue-500",
  "Transport": "bg-purple-500",
  "Personal Care": "bg-sky-500",
  "Health & Medical": "bg-pink-500",
  "Community & Social": "bg-teal-500",
  "Support Worker": "bg-indigo-500",
  "Fees & Admin": "bg-yellow-500",
  "Equipment & Supplies": "bg-violet-500",
  "Other": "bg-gray-400",
};

interface TransactionsTableProps {
  transactions: Transaction[];
}

const TransactionsTable = ({ transactions }: TransactionsTableProps) => {
  const flaggedIds = useMemo(() => {
    const alerts = detectOvercharges(transactions);
    const ids = new Map<string, string>();
    for (const alert of alerts) {
      for (const tx of alert.transactions) {
        if (!ids.has(tx.id)) {
          ids.set(tx.id, alert.type === "duplicate" ? "Possible Duplicate" : alert.type === "management-fee" ? "Fee Issue" : "Anomaly");
        }
      }
    }
    return ids;
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-lg text-muted-foreground">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold text-base">Date</TableHead>
            <TableHead className="font-semibold text-base">Category</TableHead>
            <TableHead className="font-semibold text-base">Description</TableHead>
            <TableHead className="font-semibold text-base text-right">Govt. Contribution</TableHead>
            <TableHead className="font-semibold text-base text-right">Client Contribution</TableHead>
            <TableHead className="font-semibold text-base text-right text-primary">Income</TableHead>
            <TableHead className="font-semibold text-base text-right text-destructive">Expense</TableHead>
            <TableHead className="font-semibold text-base w-[120px]">Flag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const flag = flaggedIds.get(tx.id);
            const { category } = categorizeTransaction(tx.description);
            const isIncome = tx.amount >= 0;
            const rowBg = flag
              ? "bg-destructive/10"
              : isIncome
                ? "bg-green-50 dark:bg-green-900/10"
                : CATEGORY_BG[category] || "";
            return (
              <TableRow key={tx.id} className={rowBg}>
                <TableCell className="font-mono text-base">{tx.date}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${CATEGORY_DOT[category] || "bg-gray-400"}`} />
                    <span className="text-sm">{category}</span>
                  </div>
                </TableCell>
                <TableCell className="text-base">{tx.description}</TableCell>
                <TableCell className="text-right font-mono text-base text-muted-foreground">—</TableCell>
                <TableCell className="text-right font-mono text-base text-muted-foreground">—</TableCell>
                <TableCell className="text-right font-mono text-base text-primary">
                  {isIncome ? `$${tx.amount.toFixed(2)}` : ""}
                </TableCell>
                <TableCell className="text-right font-mono text-base text-destructive">
                  {!isIncome ? `$${Math.abs(tx.amount).toFixed(2)}` : ""}
                </TableCell>
                <TableCell>
                  {flag && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className="text-xs cursor-help">
                          {flag}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">
                        Similar charge detected on a nearby date for a similar amount.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionsTable;
