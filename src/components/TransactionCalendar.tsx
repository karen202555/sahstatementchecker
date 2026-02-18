import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Transaction } from "@/lib/transactions";
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

function parseDate(dateStr: string): Date | null {
  const formats = [
    "dd/MM/yy",
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
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
  // Auto-detect starting month from first transaction
  const initialDate = useMemo(() => {
    for (const tx of transactions) {
      const d = parseDate(tx.date);
      if (d) return d;
    }
    return new Date();
  }, [transactions]);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

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

  // Build days arrays
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
          className={`text-xs font-medium mb-1 self-end rounded-full w-6 h-6 flex items-center justify-center ${today ? "bg-primary text-primary-foreground" : outsideMonth ? "text-muted-foreground" : "text-foreground"}`}
        >
          {format(day, "d")}
        </span>
        <div className="flex-1 space-y-0.5 overflow-hidden">
          {dayTx.slice(0, tall ? 6 : MAX_VISIBLE).map((tx) => (
            <div
              key={tx.id}
              className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate ${tx.amount < 0 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-700 dark:text-green-400"}`}
            >
              <span className="font-mono mr-1">
                {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
              </span>
              <span className="opacity-80">{tx.description}</span>
            </div>
          ))}
          {dayTx.length > (tall ? 6 : MAX_VISIBLE) && (
            <span className="text-[10px] text-muted-foreground pl-1">
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
          <p className="text-sm text-muted-foreground py-8 text-center">No transactions on this date</p>
        ) : (
          dayTx.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <span className="text-sm text-foreground">{tx.description}</span>
              <Badge variant={tx.amount < 0 ? "destructive" : "default"} className="font-mono shrink-0 ml-3">
                {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
              </Badge>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <h2 className="text-lg font-semibold text-foreground ml-2">{headerLabel}</h2>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm capitalize transition-colors ${viewMode === mode ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent"}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === "day" ? (
        renderDailyView()
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted">
            {DAY_NAMES.map((name) => (
              <div key={name} className="text-center text-xs font-medium text-muted-foreground py-2 border-b border-border">
                {name}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {(viewMode === "month" ? monthDays : weekDays).map((day) =>
              renderDayCell(day, viewMode === "week")
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionCalendar;
