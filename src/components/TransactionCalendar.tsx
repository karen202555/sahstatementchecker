import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Transaction } from "@/lib/transactions";
import { detectOvercharges } from "@/lib/overcharge-detector";
import { categorizeTransaction } from "@/lib/categorize";
import {
  parse,
  isValid,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

interface TransactionCalendarProps {
  transactions: Transaction[];
}

type ViewMode = "month" | "week" | "day";

const CATEGORY_COLORS: Record<string, string> = {
  "Income": "hsl(140, 70%, 40%)",
  "Meals": "hsl(35, 85%, 55%)",
  "Housing & Accommodation": "hsl(220, 70%, 55%)",
  "Domestic": "hsl(220, 60%, 50%)",
  "Transport": "hsl(270, 60%, 55%)",
  "Personal Care": "hsl(190, 70%, 45%)",
  "Health & Medical": "hsl(175, 60%, 40%)",
  "Allied Health": "hsl(310, 50%, 50%)",
  "Nursing": "hsl(25, 70%, 50%)",
  "Community & Social": "hsl(140, 60%, 45%)",
  "Support Worker": "hsl(200, 70%, 50%)",
  "Fees & Admin": "hsl(45, 80%, 50%)",
  "Equipment & Supplies": "hsl(310, 50%, 50%)",
  "Other": "hsl(215, 14%, 50%)",
};

/** Truncate descriptions to short logical terms */
function truncateDescription(desc: string): string {
  const lower = desc.toLowerCase();
  const mapping: [string[], string][] = [
    [["domestic"], "Domestic"],
    [["nursing", "nurse"], "Nursing"],
    [["meal", "food", "lunch", "dinner", "breakfast", "catering"], "Meals"],
    [["allied health", "dietician", "podiatry", "physio", "occupational", "speech", "psychology"], "Allied Health"],
    [["transport", "taxi", "uber", "bus", "train"], "Transport"],
    [["personal care", "hygiene", "grooming"], "Personal Care"],
    [["housing", "accommodation", "rent", "sil", "supported independent"], "Housing"],
    [["medical", "health", "doctor", "hospital", "dental"], "Health"],
    [["community", "social", "activity", "recreation"], "Community"],
    [["support worker", "support staff", "carer", "attendant"], "Support Worker"],
    [["fee", "admin", "management", "plan management"], "Fees"],
    [["equipment", "supplies", "assistive", "wheelchair"], "Equipment"],
    [["income", "payment received", "deposit", "credit", "funding"], "Income"],
  ];
  for (const [keywords, label] of mapping) {
    if (keywords.some((kw) => lower.includes(kw))) return label;
  }
  // Fallback: first two words
  const words = desc.split(/\s+/);
  return words.slice(0, 2).join(" ");
}

/** Format amount: no minus, drop .00 */
function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs % 1 === 0) return `$${abs}`;
  return `$${abs.toFixed(2)}`;
}

function parseDate(dateStr: string): Date | null {
  const formats = [
    "yyyy-MM-dd",
    "dd/MM/yy",
    "dd/MM/yyyy",
    "MM/dd/yyyy",
    "M/d/yyyy",
    "MM-dd-yyyy",
  ];
  for (const fmt of formats) {
    const d = parse(dateStr, fmt, new Date());
    if (isValid(d)) return d;
  }
  const d = new Date(dateStr);
  return isValid(d) ? d : null;
}

const TransactionCalendar = ({ transactions }: TransactionCalendarProps) => {
  const flaggedIds = useMemo(() => {
    const alerts = detectOvercharges(transactions);
    const ids = new Set<string>();
    for (const alert of alerts) {
      if (alert.type === "duplicate") {
        for (let i = 1; i < alert.transactions.length; i++) {
          ids.add(alert.transactions[i].id);
        }
      }
    }
    return ids;
  }, [transactions]);

  const initialDate = useMemo(() => {
    const monthCounts = new Map<string, { count: number; date: Date }>();
    for (const tx of transactions) {
      const d = parseDate(tx.date);
      if (!d) continue;
      const key = format(d, "yyyy-MM");
      const entry = monthCounts.get(key);
      if (entry) entry.count++;
      else monthCounts.set(key, { count: 1, date: d });
    }
    let best: Date = new Date();
    let bestCount = 0;
    for (const [, { count, date }] of monthCounts) {
      if (count > bestCount) { bestCount = count; best = date; }
    }
    return best;
  }, [transactions]);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  useEffect(() => { setCurrentDate(initialDate); }, [initialDate]);

  const txByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const d = parseDate(tx.date);
      if (!d) continue;
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return map;
  }, [transactions]);

  const legendItems = useMemo(() => {
    const seen = new Set<string>();
    for (const tx of transactions) {
      const { category } = categorizeTransaction(tx.description);
      seen.add(category);
      if (tx.amount >= 0) seen.add("Income");
    }
    return Array.from(seen).map((cat) => ({
      label: cat,
      color: CATEGORY_COLORS[cat] || "hsl(215, 14%, 50%)",
    }));
  }, [transactions]);

  const navigate = (direction: "prev" | "next") => {
    const fn = direction === "next"
      ? viewMode === "month" ? addMonths : viewMode === "week" ? addWeeks : addDays
      : viewMode === "month" ? subMonths : viewMode === "week" ? subWeeks : subDays;
    setCurrentDate((d) => fn(d, 1));
  };

  const headerLabel =
    viewMode === "month"
      ? format(currentDate, "MMMM yyyy")
      : viewMode === "week"
        ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d, yyyy")}`
        : format(currentDate, "EEEE, MMMM d, yyyy");

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderDayCell = (day: Date, tall: boolean) => {
    const key = format(day, "yyyy-MM-dd");
    const dayTx = txByDate.get(key) || [];
    const outsideMonth = viewMode === "month" && !isSameMonth(day, currentDate);
    const today = isToday(day);
    const count = dayTx.length;

    return (
      <div
        key={key}
        className={`border border-border p-1 flex flex-col ${tall ? "min-h-[180px]" : "min-h-[90px]"} ${outsideMonth ? "bg-muted/30" : "bg-card"} ${today ? "ring-2 ring-primary ring-inset" : ""}`}
      >
        <span
          className={`text-[11px] font-medium mb-0.5 self-end rounded-full w-6 h-6 flex items-center justify-center ${today ? "bg-primary text-primary-foreground" : outsideMonth ? "text-muted-foreground" : "text-foreground"}`}
        >
          {format(day, "d")}
        </span>
        {count > 0 && (
          <div className={`flex-1 flex flex-col gap-px overflow-hidden`}>
            {dayTx.map((tx) => {
              const isFlagged = flaggedIds.has(tx.id);
              const { category } = categorizeTransaction(tx.description);
              const catColor = CATEGORY_COLORS[category] || CATEGORY_COLORS["Other"];
              const label = truncateDescription(tx.description);
              const amt = formatAmount(tx.amount);

              return (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between gap-1 px-1.5 overflow-hidden ${isFlagged ? "ring-1 ring-destructive/40" : ""}`}
                  style={{
                    backgroundColor: isFlagged ? "hsl(0, 80%, 95%)" : `${catColor}20`,
                    borderRadius: "8px",
                    minHeight: count <= 2 ? "28px" : count <= 4 ? "22px" : "18px",
                    flex: "1 1 0",
                  }}
                  title={`${category}: ${tx.description} — ${amt}`}
                >
                  <span
                    className="truncate font-medium"
                    style={{
                      color: isFlagged ? "hsl(0, 70%, 40%)" : catColor,
                      fontSize: count <= 2 ? "11px" : count <= 4 ? "10px" : "9px",
                    }}
                  >
                    {label}
                    {isFlagged && " ⚑"}
                  </span>
                  <span
                    className="shrink-0 font-mono font-medium"
                    style={{
                      fontSize: count <= 2 ? "11px" : count <= 4 ? "10px" : "9px",
                      color: isFlagged ? "hsl(0, 70%, 40%)" : catColor,
                    }}
                  >
                    {amt}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDailyView = () => {
    const key = format(currentDate, "yyyy-MM-dd");
    const dayTx = txByDate.get(key) || [];
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        {dayTx.length === 0 ? (
          <p className="text-base text-muted-foreground py-8 text-center">No transactions on this date</p>
        ) : (
          dayTx.map((tx) => {
            const isFlagged = flaggedIds.has(tx.id);
            return (
              <div key={tx.id} className={`flex items-center justify-between rounded-lg px-4 py-3 ${isFlagged ? "bg-destructive/10" : "bg-muted"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base text-foreground">{tx.description}</span>
                  {isFlagged && (
                    <Badge variant="destructive" className="text-xs">Possible Duplicate</Badge>
                  )}
                </div>
                <Badge variant={tx.amount < 0 ? "destructive" : "default"} className="font-mono shrink-0 ml-3 text-base">
                  {formatAmount(tx.amount)}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 no-print">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-[14px]">
            Today
          </Button>
          <h2 className="text-lg font-semibold text-foreground ml-2">{headerLabel}</h2>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-[13px] font-medium capitalize transition-colors ${viewMode === mode ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent"}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Statement Checker — {headerLabel}</h1>
      </div>

      {/* Calendar Grid */}
      {viewMode === "day" ? (
        renderDailyView()
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 bg-muted">
            {DAY_NAMES.map((name) => (
              <div key={name} className="text-center text-[12px] font-semibold text-muted-foreground py-1.5 border-b border-border">
                {name}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {(viewMode === "month" ? monthDays : weekDays).map((day) =>
              renderDayCell(day, viewMode === "week")
            )}
          </div>
        </div>
      )}

      {/* Category legend */}
      <div className="flex flex-wrap gap-2 text-[12px] no-print">
        <span className="text-muted-foreground font-medium mr-1">Legend:</span>
        {legendItems.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Potential Issue</span>
      </div>
    </div>
  );
};

export default TransactionCalendar;
