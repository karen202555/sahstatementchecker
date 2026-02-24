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
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

const CATEGORY_BG: Record<string, string> = {
  "Meals": "bg-orange-50 dark:bg-orange-950/20",
  "Nursing": "bg-pink-50 dark:bg-pink-950/20",
  "Domestic": "bg-blue-50 dark:bg-blue-950/20",
  "Allied Health": "bg-violet-50 dark:bg-violet-950/20",
  "Transport": "bg-purple-50 dark:bg-purple-950/20",
  "Personal Care": "bg-sky-50 dark:bg-sky-950/20",
  "Housing & Accommodation": "bg-indigo-50 dark:bg-indigo-950/20",
  "Health & Medical": "bg-rose-50 dark:bg-rose-950/20",
  "Community & Social": "bg-teal-50 dark:bg-teal-950/20",
  "Support Worker": "bg-cyan-50 dark:bg-cyan-950/20",
  "Fees & Admin": "bg-yellow-50 dark:bg-yellow-950/20",
  "Equipment & Supplies": "bg-amber-50 dark:bg-amber-950/20",
  "Other": "",
};

const CATEGORY_DOT: Record<string, string> = {
  "Meals": "bg-orange-400",
  "Nursing": "bg-pink-400",
  "Domestic": "bg-blue-400",
  "Allied Health": "bg-violet-400",
  "Transport": "bg-purple-400",
  "Personal Care": "bg-sky-400",
  "Housing & Accommodation": "bg-indigo-400",
  "Health & Medical": "bg-rose-400",
  "Community & Social": "bg-teal-400",
  "Support Worker": "bg-cyan-400",
  "Fees & Admin": "bg-yellow-400",
  "Equipment & Supplies": "bg-amber-400",
  "Other": "bg-gray-400",
};

const DECISION_STYLES: Record<DecisionType, string> = {
  approve: "border-l-2 border-green-400 bg-green-50/60 dark:bg-green-950/15",
  dispute: "border-l-2 border-red-400 bg-red-50/60 dark:bg-red-950/15",
  "not-sure": "border-l-2 border-yellow-400 bg-yellow-50/60 dark:bg-yellow-950/15",
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "escalated", label: "Escalated" },
];

const STATUS_COLORS: Record<string, string> = {
  "new": "bg-muted text-muted-foreground",
  "in-progress": "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  "resolved": "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
  "escalated": "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
};

interface DisputeEdit {
  description: string;
  amount: string;
  note: string;
  isDuplicate: boolean;
}

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
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);
  const [disputeEdits, setDisputeEdits] = useState<Map<string, DisputeEdit>>(new Map());

  const flaggedIds = useMemo(() => {
    const alerts = detectOvercharges(transactions);
    const ids = new Map<string, string>();
    for (const alert of alerts) {
      if (alert.type === "duplicate") {
        for (let i = 1; i < alert.transactions.length; i++) {
          const tx = alert.transactions[i];
          if (!ids.has(tx.id)) ids.set(tx.id, "Possible Duplicate");
        }
      } else {
        for (const tx of alert.transactions) {
          if (!ids.has(tx.id)) ids.set(tx.id, alert.type === "management-fee" ? "Fee Issue" : "Anomaly");
        }
      }
    }
    return ids;
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-10 text-center">
        <p className="text-[15px] text-muted-foreground">No transactions found</p>
      </div>
    );
  }

  const openDispute = (tx: Transaction) => {
    const flag = flaggedIds.get(tx.id);
    const isDuplicate = flag === "Possible Duplicate";
    setDisputeEdits((prev) => {
      const next = new Map(prev);
      if (!next.has(tx.id)) {
        next.set(tx.id, {
          description: tx.description,
          amount: isDuplicate ? "0.00" : Math.abs(tx.amount).toFixed(2),
          note: isDuplicate ? "Duplicate charge" : "",
          isDuplicate,
        });
      }
      return next;
    });
    setExpandedDispute(tx.id);
  };

  const handleDecision = (tx: Transaction, decision: DecisionType) => {
    if (!onDecision) return;
    if (decision === "dispute") {
      if (expandedDispute === tx.id) {
        const edit = disputeEdits.get(tx.id);
        const note = edit
          ? `Agreed: ${edit.description} @ $${edit.amount}${edit.note ? ` — ${edit.note}` : ""}`
          : undefined;
        onDecision(tx, decision, note);
        setExpandedDispute(null);
      } else {
        openDispute(tx);
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

  const updateDisputeEdit = (txId: string, field: keyof DisputeEdit, value: string | boolean) => {
    setDisputeEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(txId);
      if (current) {
        next.set(txId, { ...current, [field]: value });
      }
      return next;
    });
  };

  const colCount = isAuthenticated ? 10 : 9;

  return (
    <div className="rounded-[10px] border border-border bg-card overflow-x-auto shadow-[0_1px_3px_0_hsl(0_0%_0%/0.04)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-[hsl(210,15%,97%)] dark:bg-muted/50 hover:bg-[hsl(210,15%,97%)]">
            <TableHead className="text-[14px] font-semibold py-2 px-3">Date</TableHead>
            <TableHead className="text-[14px] font-semibold py-2 px-3">Category</TableHead>
            <TableHead className="text-[14px] font-semibold py-2 px-3 max-w-[320px]">Description</TableHead>
            <TableHead className="text-[14px] font-semibold py-2 px-3 text-right">Govt.</TableHead>
            <TableHead className="text-[14px] font-semibold py-2 px-3 text-right">Client</TableHead>
            <TableHead className="text-[14px] font-semibold py-2 px-3 text-right text-primary">Income</TableHead>
            <TableHead className="text-[14px] font-semibold py-2 px-3 text-right text-destructive">Expense</TableHead>
            <TableHead className="text-[14px] font-semibold py-2 px-3 w-[100px]">Flag</TableHead>
            <TableHead className="text-[14px] font-semibold py-2 px-3 w-[110px]">Status</TableHead>
            {isAuthenticated && (
              <TableHead className="text-[14px] font-semibold py-2 px-3 w-[160px] no-print">Decision</TableHead>
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

            const rowBg = existing
              ? DECISION_STYLES[existing.decision]
              : flag
                ? "bg-red-50/50 dark:bg-red-950/10"
                : isIncome
                  ? "bg-green-50/40 dark:bg-green-950/10"
                  : CATEGORY_BG[category] || "";

            const disputeEdit = disputeEdits.get(tx.id);

            return (
              <>
                <TableRow key={tx.id} className={`${rowBg} hover:bg-muted/30`}>
                  <TableCell className="font-mono text-[15px] py-2 px-3 whitespace-nowrap">{formatDateDDMMYYYY(tx.date)}</TableCell>
                  <TableCell className="py-2 px-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${CATEGORY_DOT[category] || "bg-gray-400"}`} />
                      <span className="text-[13px] font-medium">{category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[15px] py-2 px-3 max-w-[320px]">{tx.description}</TableCell>
                  <TableCell className="text-right font-mono text-[15px] py-2 px-3">
                    {tx.govt_contribution != null ? (
                      <span className="text-primary">${tx.govt_contribution.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[15px] py-2 px-3">
                    {tx.client_contribution != null ? (
                      <span>${tx.client_contribution.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[15px] py-2 px-3 text-primary font-medium">
                    {isIncome ? `$${tx.amount.toFixed(2)}` : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[15px] py-2 px-3 text-destructive font-medium">
                    {!isIncome ? `$${Math.abs(tx.amount).toFixed(2)}` : ""}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {flag && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center h-6 px-2 rounded-full text-[13px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300 cursor-help whitespace-nowrap">
                            {flag}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-[13px]">
                          Similar charge detected on a nearby date for a similar amount.
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {isAuthenticated && onStatusUpdate ? (
                      <Select
                        value={tx.status || "new"}
                        onValueChange={(val) => onStatusUpdate(tx.id, val)}
                      >
                        <SelectTrigger className="h-6 text-[12px] w-[100px] rounded-md border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`inline-flex items-center h-6 px-2 rounded-full text-[12px] font-medium ${STATUS_COLORS[tx.status || "new"] || STATUS_COLORS["new"]}`}>
                        {STATUS_OPTIONS.find((o) => o.value === (tx.status || "new"))?.label || "New"}
                      </span>
                    )}
                  </TableCell>
                  {isAuthenticated && (
                    <TableCell className="no-print py-2 px-3">
                      {existing ? (
                        <div className="flex items-center gap-1">
                          {existing.decision === "approve" && (
                            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[13px] font-semibold bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          )}
                          {existing.decision === "dispute" && (
                            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[13px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300">
                              <XCircle className="h-3 w-3" /> Disputed
                            </span>
                          )}
                          {existing.decision === "not-sure" && (
                            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[13px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300">
                              <HelpCircle className="h-3 w-3" /> Not Sure
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {suggestion && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleSuggestionAccept(tx, suggestion)}
                                  className="flex items-center gap-1 text-[12px] text-amber-600 hover:text-amber-800"
                                >
                                  <Lightbulb className="h-3 w-3" />
                                  <span className="underline">
                                    Usually {suggestion.preferred_decision}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-[13px]">
                                Based on {suggestion.occurrence_count} previous decisions. Click to apply.
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <div className="flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
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
                                  className="h-7 w-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
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
                                  className="h-7 w-7 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
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
                {/* Dispute edit row — mimics the charged line with editable fields */}
                {expandedDispute === tx.id && disputeEdit && (
                  <TableRow key={`${tx.id}-dispute`} className="bg-red-50/40 dark:bg-red-950/15 border-l-2 border-red-400">
                    <TableCell className="font-mono text-[13px] py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {formatDateDDMMYYYY(tx.date)}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <span className="text-[12px] font-semibold text-red-600">YOUR RESPONSE</span>
                    </TableCell>
                    <TableCell className="py-2 px-3" colSpan={1}>
                      <Input
                        value={disputeEdit.description}
                        onChange={(e) => updateDisputeEdit(tx.id, "description", e.target.value)}
                        className="h-7 text-[13px] bg-white dark:bg-background"
                        placeholder="Agreed description..."
                      />
                    </TableCell>
                    <TableCell className="py-2 px-3" colSpan={2}>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={disputeEdit.isDuplicate}
                          onChange={(e) => {
                            updateDisputeEdit(tx.id, "isDuplicate", e.target.checked);
                            if (e.target.checked) {
                              updateDisputeEdit(tx.id, "amount", "0.00");
                              updateDisputeEdit(tx.id, "note", "Duplicate charge");
                            } else {
                              updateDisputeEdit(tx.id, "amount", Math.abs(tx.amount).toFixed(2));
                              updateDisputeEdit(tx.id, "note", "");
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-[12px] font-medium text-red-700">Duplicate</span>
                      </label>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[13px] text-muted-foreground">$</span>
                        <Input
                          value={disputeEdit.amount}
                          onChange={(e) => updateDisputeEdit(tx.id, "amount", e.target.value)}
                          className="h-7 text-[13px] w-20 text-right font-mono bg-white dark:bg-background"
                          disabled={disputeEdit.isDuplicate}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3" colSpan={isAuthenticated ? 2 : 1}>
                      <Input
                        value={disputeEdit.note}
                        onChange={(e) => updateDisputeEdit(tx.id, "note", e.target.value)}
                        className="h-7 text-[13px] bg-white dark:bg-background"
                        placeholder="Reason for dispute..."
                        disabled={disputeEdit.isDuplicate}
                      />
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-[12px] font-medium rounded-md px-2"
                          onClick={() => {
                            const edit = disputeEdits.get(tx.id);
                            const note = edit
                              ? `Agreed: ${edit.description} @ $${edit.amount}${edit.note ? ` — ${edit.note}` : ""}`
                              : undefined;
                            onDecision?.(tx, "dispute", note);
                            setExpandedDispute(null);
                          }}
                        >
                          Submit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[12px] font-medium rounded-md px-2"
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
