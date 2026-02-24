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
  "Income": "bg-green-200 text-green-900 dark:bg-green-800/40 dark:text-green-200",
  "Meals & Food": "bg-orange-200 text-orange-900 dark:bg-orange-800/40 dark:text-orange-200",
  "Housing & Accommodation": "bg-blue-200 text-blue-900 dark:bg-blue-800/40 dark:text-blue-200",
  "Domestic": "bg-blue-100 text-blue-800 dark:bg-blue-700/40 dark:text-blue-200",
  "Transport": "bg-purple-200 text-purple-900 dark:bg-purple-800/40 dark:text-purple-200",
  "Personal Care": "bg-sky-200 text-sky-900 dark:bg-sky-800/40 dark:text-sky-200",
  "Health & Medical": "bg-pink-200 text-pink-900 dark:bg-pink-800/40 dark:text-pink-200",
  "Allied Health": "bg-pink-100 text-pink-800 dark:bg-pink-700/40 dark:text-pink-200",
  "Nursing": "bg-rose-200 text-rose-900 dark:bg-rose-800/40 dark:text-rose-200",
  "Community & Social": "bg-teal-200 text-teal-900 dark:bg-teal-800/40 dark:text-teal-200",
  "Support Worker": "bg-indigo-200 text-indigo-900 dark:bg-indigo-800/40 dark:text-indigo-200",
  "Fees & Admin": "bg-yellow-200 text-yellow-900 dark:bg-yellow-800/40 dark:text-yellow-200",
  "Equipment & Supplies": "bg-violet-200 text-violet-900 dark:bg-violet-800/40 dark:text-violet-200",
  "Other": "bg-gray-200 text-gray-900 dark:bg-gray-700/40 dark:text-gray-200",
};

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
        // Only flag the second transaction in a duplicate pair
        for (let i = 1; i < alert.transactions.length; i++) {
          ids.add(alert.transactions[i].id);
        }
      }
    }
    return ids;
  }, [transactions]);

  // Find the month with the most transactions to use as initial
  const initialDate = useMemo(() => {
    const monthCounts = new Map<string, { count: number; date: Date }>();
    for (const tx of transactions) {
      const d = parseDate(tx.date);
      if (!d) continue;
      const key = format(d, "yyyy-MM");
      const entry = monthCounts.get(key);
      if (entry) {
        entry.count++;
      } else {
        monthCounts.set(key, { count: 1, date: d });
      }
    }
    let best: Date = new Date();
    let bestCount = 0;
    for (const [, { count, date }] of monthCounts) {
      if (count > bestCount) {
        bestCount = count;
        best = date;
      }
    }
    return best;
  }, [transactions]);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // Re-sync when transactions change (new upload)
  useEffect(() => {
    setCurrentDate(initialDate);
  }, [initialDate]);

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

  // Build dynamic legend from actual transaction categories
  const CATEGORY_DOT_COLORS: Record<string, string> = {
    "Income": "hsl(140, 70%, 40%)",
    "Meals & Food": "hsl(35, 85%, 55%)",
    "Housing & Accommodation": "hsl(220, 70%, 55%)",
    "Domestic": "hsl(220, 70%, 55%)",
    "Transport": "hsl(270, 60%, 55%)",
    "Health & Medical": "hsl(340, 65%, 50%)",
    "Allied Health": "hsl(310, 50%, 50%)",
    "Nursing": "hsl(340, 65%, 50%)",
    "Personal Care": "hsl(190, 70%, 45%)",
    "Community & Social": "hsl(140, 60%, 45%)",
    "Support Worker": "hsl(200, 70%, 50%)",
    "Fees & Admin": "hsl(45, 80%, 50%)",
    "Equipment & Supplies": "hsl(310, 50%, 50%)",
    "Other": "hsl(215, 14%, 50%)",
  };

  const legendItems = useMemo(() => {
    const seen = new Set<string>();
    for (const tx of transactions) {
      const { category } = categorizeTransaction(tx.description);
      seen.add(category);
      if (tx.amount >= 0) seen.add("Income");
    }
    return Array.from(seen).map((cat) => ({
      label: cat,
      color: CATEGORY_DOT_COLORS[cat] || "hsl(215, 14%, 50%)",
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
  const MAX_VISIBLE = 3;

  const renderDayCell = (day: Date, tall: boolean) => {
    const key = format(day, "yyyy-MM-dd");
    const dayTx = txByDate.get(key) || [];
    const outsideMonth = viewMode === "month" && !isSameMonth(day, currentDate);
    const today = isToday(day);

    return (
      <div
        key={key}
        className={`border border-border p-1.5 flex flex-col ${tall ? "min-h-[180px]" : "min-h-[100px]"} ${outsideMonth ? "bg-muted/30" : "bg-card"} ${today ? "ring-2 ring-primary ring-inset" : ""}`}
      >
        <span
          className={`text-sm font-medium mb-1 self-end rounded-full w-7 h-7 flex items-center justify-center ${today ? "bg-primary text-primary-foreground" : outsideMonth ? "text-muted-foreground" : "text-foreground"}`}
        >
          {format(day, "d")}
        </span>
        <div className="flex-1 space-y-0.5 overflow-hidden">
          {dayTx.slice(0, tall ? 6 : MAX_VISIBLE).map((tx) => {
            const isFlagged = flaggedIds.has(tx.id);
            const isIncome = tx.amount >= 0 || categorizeTransaction(tx.description).category === "Income";
            const { category } = categorizeTransaction(tx.description);
            const colorClass = isFlagged
              ? "bg-destructive/20 text-destructive ring-1 ring-destructive/30"
              : isIncome
                ? CATEGORY_COLORS["Income"]
                : CATEGORY_COLORS[category] || CATEGORY_COLORS["Other"];

            return (
              <div
                key={tx.id}
                className={`text-xs leading-tight rounded px-1 py-0.5 truncate ${colorClass}`}
                title={isFlagged ? "⚑ Possible Duplicate" : `${category}: ${tx.description}`}
              >
                <span className="font-mono mr-1">
                  {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                </span>
                <span className="opacity-80">{tx.description}</span>
                {isFlagged && <span className="ml-1 font-semibold">⚑</span>}
              </div>
            );
          })}
          {dayTx.length > (tall ? 6 : MAX_VISIBLE) && (
            <span className="text-xs text-muted-foreground pl-1">
              +{dayTx.length - (tall ? 6 : MAX_VISIBLE)} more
            </span>
          )}
        </div>
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
                  {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
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
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-base">
            Today
          </Button>
          <h2 className="text-xl font-semibold text-foreground ml-2">{headerLabel}</h2>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-base capitalize transition-colors ${viewMode === mode ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent"}`}
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
              <div key={name} className="text-center text-sm font-medium text-muted-foreground py-2 border-b border-border">
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
      <div className="flex flex-wrap gap-2 text-sm no-print">
        <span className="text-muted-foreground font-medium mr-1">Legend:</span>
        {legendItems.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-destructive" /> Potential Issue</span>
      </div>
    </div>
  );
};

export default TransactionCalendar;
