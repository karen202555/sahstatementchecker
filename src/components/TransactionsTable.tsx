import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, HelpCircle, Lightbulb } from "lucide-react";
import type { Transaction } from "@/lib/transactions";
import { detectOvercharges } from "@/lib/overcharge-detector";
import { categorizeTransaction } from "@/lib/categorize";
import { useMemo, useState } from "react";
import type { DecisionType, MemorySuggestion, TransactionDecision } from "@/hooks/use-decisions";

function formatDateDDMMYYYY(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const CATEGORY_BG: Record<string, string> = {
  "Meals & Food": "bg-orange-100 dark:bg-orange-900/30",
  "Nursing": "bg-pink-100 dark:bg-pink-900/30",
  "Domestic": "bg-blue-100 dark:bg-blue-900/30",
  "Allied Health": "bg-violet-100 dark:bg-violet-900/30",
  "Transport": "bg-purple-100 dark:bg-purple-900/30",
  "Personal Care": "bg-sky-100 dark:bg-sky-900/30",
  "Housing & Accommodation": "bg-indigo-100 dark:bg-indigo-900/30",
  "Health & Medical": "bg-rose-100 dark:bg-rose-900/30",
  "Community & Social": "bg-teal-100 dark:bg-teal-900/30",
  "Support Worker": "bg-cyan-100 dark:bg-cyan-900/30",
  "Fees & Admin": "bg-yellow-100 dark:bg-yellow-900/30",
  "Equipment & Supplies": "bg-amber-100 dark:bg-amber-900/30",
  "Other": "",
};

const CATEGORY_DOT: Record<string, string> = {
  "Meals & Food": "bg-orange-500",
  "Nursing": "bg-pink-500",
  "Domestic": "bg-blue-500",
  "Allied Health": "bg-violet-500",
  "Transport": "bg-purple-500",
  "Personal Care": "bg-sky-500",
  "Housing & Accommodation": "bg-indigo-500",
  "Health & Medical": "bg-rose-500",
  "Community & Social": "bg-teal-500",
  "Support Worker": "bg-cyan-500",
  "Fees & Admin": "bg-yellow-500",
  "Equipment & Supplies": "bg-amber-500",
  "Other": "bg-gray-400",
};

const DECISION_STYLES: Record<DecisionType, string> = {
  approve: "border-green-500 bg-green-50 dark:bg-green-900/20",
  dispute: "border-red-500 bg-red-50 dark:bg-red-900/20",
  "not-sure": "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "escalated", label: "Escalated" },
];

const STATUS_COLORS: Record<string, string> = {
  "new": "bg-muted text-muted-foreground",
  "in-progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "resolved": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "escalated": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface TransactionsTableProps {
  transactions: Transaction[];
  decisions?: Map<string, TransactionDecision>;
  onDecision?: (tx: Transaction, decision: DecisionType, note?: string) => void;
  getSuggestion?: (tx: Transaction) => MemorySuggestion | null;
  isAuthenticated?: boolean;
  onStatusUpdate?: (txId: string, status: string) => void;
}

const TransactionsTable = ({
  transactions,
  decisions = new Map(),
  onDecision,
  getSuggestion,
  isAuthenticated = false,
  onStatusUpdate,
}: TransactionsTableProps) => {
  const [disputeNotes, setDisputeNotes] = useState<Map<string, string>>(new Map());
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);

  const flaggedIds = useMemo(() => {
    const alerts = detectOvercharges(transactions);
    const ids = new Map<string, string>();
    for (const alert of alerts) {
      if (alert.type === "duplicate") {
        for (let i = 1; i < alert.transactions.length; i++) {
          const tx = alert.transactions[i];
          if (!ids.has(tx.id)) {
            ids.set(tx.id, "Possible Duplicate");
          }
        }
      } else {
        for (const tx of alert.transactions) {
          if (!ids.has(tx.id)) {
            ids.set(tx.id, alert.type === "management-fee" ? "Fee Issue" : "Anomaly");
          }
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

  const handleDecision = (tx: Transaction, decision: DecisionType) => {
    if (!onDecision) return;
    if (decision === "dispute") {
      if (expandedDispute === tx.id) {
        onDecision(tx, decision, disputeNotes.get(tx.id) || undefined);
        setExpandedDispute(null);
      } else {
        setExpandedDispute(tx.id);
      }
    } else {
      onDecision(tx, decision);
      setExpandedDispute(null);
    }
  };

  const handleSuggestionAccept = (tx: Transaction, suggestion: MemorySuggestion) => {
    if (!onDecision) return;
    onDecision(tx, suggestion.preferred_decision);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
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
            <TableHead className="font-semibold text-base w-[120px]">Status</TableHead>
            {isAuthenticated && (
              <TableHead className="font-semibold text-base w-[200px] no-print">Decision</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const flag = flaggedIds.get(tx.id);
            const { category } = categorizeTransaction(tx.description);
            const isIncome = tx.amount >= 0;
            const existing = decisions.get(tx.id);
            const suggestion = getSuggestion && !existing ? getSuggestion(tx) : null;

            const decisionBorder = existing ? DECISION_STYLES[existing.decision] : "";
            const rowBg = existing
              ? decisionBorder
              : flag
                ? "bg-destructive/10"
                : isIncome
                  ? "bg-green-50 dark:bg-green-900/10"
                  : CATEGORY_BG[category] || "";

            return (
              <>
                <TableRow key={tx.id} className={`${rowBg} ${existing ? "border-l-2" : ""}`}>
                  <TableCell className="font-mono text-base">{formatDateDDMMYYYY(tx.date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${CATEGORY_DOT[category] || "bg-gray-400"}`} />
                      <span className="text-sm">{category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-base">{tx.description}</TableCell>
                  <TableCell className="text-right font-mono text-base">
                    {tx.govt_contribution != null ? (
                      <span className="text-primary">${tx.govt_contribution.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-base">
                    {tx.client_contribution != null ? (
                      <span>${tx.client_contribution.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
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
                  <TableCell>
                    {isAuthenticated && onStatusUpdate ? (
                      <Select
                        value={tx.status || "new"}
                        onValueChange={(val) => onStatusUpdate(tx.id, val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`text-xs ${STATUS_COLORS[tx.status || "new"] || STATUS_COLORS["new"]}`}>
                        {STATUS_OPTIONS.find((o) => o.value === (tx.status || "new"))?.label || "New"}
                      </Badge>
                    )}
                  </TableCell>
                  {isAuthenticated && (
                    <TableCell className="no-print">
                      {existing ? (
                        <div className="flex items-center gap-1.5">
                          {existing.decision === "approve" && (
                            <Badge className="bg-green-600 text-white text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </Badge>
                          )}
                          {existing.decision === "dispute" && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <XCircle className="h-3 w-3" /> Disputed
                            </Badge>
                          )}
                          {existing.decision === "not-sure" && (
                            <Badge className="bg-yellow-500 text-white text-xs gap-1">
                              <HelpCircle className="h-3 w-3" /> Not Sure
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {suggestion && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleSuggestionAccept(tx, suggestion)}
                                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 mb-0.5"
                                >
                                  <Lightbulb className="h-3 w-3" />
                                  <span className="underline">
                                    You usually {suggestion.preferred_decision} {category}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-sm">
                                Based on {suggestion.occurrence_count} previous decisions. Click to apply.
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                                  onClick={() => handleDecision(tx, "approve")}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Approve</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                                  onClick={() => handleDecision(tx, "dispute")}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Dispute</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                                  onClick={() => handleDecision(tx, "not-sure")}
                                >
                                  <HelpCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Not Sure</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
                {expandedDispute === tx.id && (
                  <TableRow key={`${tx.id}-note`} className="bg-red-50/50 dark:bg-red-900/10">
                    <TableCell colSpan={isAuthenticated ? 10 : 9}>
                      <div className="flex items-center gap-2 py-1">
                        <Input
                          placeholder="Add a note about this dispute (optional)..."
                          value={disputeNotes.get(tx.id) || ""}
                          onChange={(e) =>
                            setDisputeNotes((prev) => {
                              const next = new Map(prev);
                              next.set(tx.id, e.target.value);
                              return next;
                            })
                          }
                          className="max-w-md text-sm"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            onDecision?.(tx, "dispute", disputeNotes.get(tx.id) || undefined);
                            setExpandedDispute(null);
                          }}
                        >
                          Submit Dispute
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedDispute(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionsTable;
