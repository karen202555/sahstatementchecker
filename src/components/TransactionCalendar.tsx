import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

interface TransactionCalendarProps {
  transactions: Transaction[];
}

/** Category short codes and soft colors */
const CATEGORY_STYLE: Record<string, { code: string; bg: string; text: string }> = {
  "Nursing":                { code: "NUR", bg: "#FCE7F3", text: "#9D174D" },
  "Domestic":               { code: "DOM", bg: "#FFEDD5", text: "#9A3412" },
  "Meals":                  { code: "MEA", bg: "#FEF9C3", text: "#854D0E" },
  "Allied Health":          { code: "ALL", bg: "#EDE9FE", text: "#5B21B6" },
  "Equipment & Supplies":   { code: "EQP", bg: "#DCFCE7", text: "#166534" },
  "Transport":              { code: "TRN", bg: "#DBEAFE", text: "#1E40AF" },
  "Personal Care":          { code: "PER", bg: "#E0F2FE", text: "#075985" },
  "Housing & Accommodation":{ code: "HOU", bg: "#F3E8FF", text: "#6B21A8" },
  "Health & Medical":       { code: "MED", bg: "#CCFBF1", text: "#115E59" },
  "Community & Social":     { code: "COM", bg: "#D1FAE5", text: "#065F46" },
  "Support Worker":         { code: "SUP", bg: "#BFDBFE", text: "#1E3A8A" },
  "Fees & Admin":           { code: "FEE", bg: "#FEF3C7", text: "#92400E" },
  "Income":                 { code: "INC", bg: "#D1FAE5", text: "#065F46" },
  "Other":                  { code: "OTH", bg: "#F3F4F6", text: "#374151" },
};

function getStyle(category: string) {
  return CATEGORY_STYLE[category] || CATEGORY_STYLE["Other"];
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs % 1 === 0) return `$${abs}`;
  return `$${abs.toFixed(2)}`;
}

function getUnitsLabel(tx: Transaction): string {
  if (!tx.unit_cost || tx.unit_cost === 0) return "—";
  const units = Math.round(Math.abs(tx.amount) / tx.unit_cost * 10) / 10;
  const rateStr = (tx.rate_units || "").toLowerCase();
  if (rateStr.includes("hour") || rateStr.includes("hr")) return `${units}h`;
  if (rateStr.includes("km")) return `${units}km`;
  if (rateStr.includes("day")) return `${units}d`;
  return `${units}u`;
}

function parseDate(dateStr: string): Date | null {
  const formats = ["yyyy-MM-dd", "dd/MM/yy", "dd/MM/yyyy", "MM/dd/yyyy", "M/d/yyyy", "MM-dd-yyyy"];
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const rowCount = monthDays.length / 7;

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const MAX_BLOCKS = 8;

  const selectedDayTx = selectedDay ? txByDate.get(selectedDay) || [] : [];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 no-print">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-[14px]">
            Today
          </Button>
          <h2 className="text-lg font-semibold text-foreground ml-2">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Statement Checker — {format(currentDate, "MMMM yyyy")}</h1>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {/* Day name headers */}
        <div className="grid grid-cols-7 bg-muted border-b border-border">
          {DAY_NAMES.map((name) => (
            <div key={name} className="text-center text-[13px] font-semibold text-muted-foreground py-2">
              {name}
            </div>
          ))}
        </div>

        {/* Day cells — fixed equal grid */}
        <div
          className="grid grid-cols-7"
          style={{
            gridTemplateRows: `repeat(${rowCount}, 1fr)`,
          }}
        >
          {monthDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTx = txByDate.get(key) || [];
            const outsideMonth = !isSameMonth(day, currentDate);
            const today = isToday(day);
            const visibleTx = dayTx.slice(0, MAX_BLOCKS);
            const overflow = dayTx.length - MAX_BLOCKS;

            return (
              <div
                key={key}
                className={`border-b border-r border-border p-1.5 flex flex-col cursor-pointer transition-colors hover:bg-accent/30 ${outsideMonth ? "bg-muted/30" : ""} ${today ? "ring-2 ring-primary ring-inset" : ""}`}
                style={{ minHeight: "130px" }}
                onClick={() => setSelectedDay(key)}
              >
                {/* Date number — top left */}
                <span
                  className={`text-[14px] font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${today ? "bg-primary text-primary-foreground" : outsideMonth ? "text-muted-foreground" : "text-foreground"}`}
                >
                  {format(day, "d")}
                </span>

                {/* Transaction blocks grid */}
                {visibleTx.length > 0 && (
                  <div
                    className="flex-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))",
                      gap: "3px",
                      alignContent: "start",
                    }}
                  >
                    {visibleTx.map((tx) => {
                      const { category } = categorizeTransaction(tx.description);
                      const style = getStyle(category);
                      const isFlagged = flaggedIds.has(tx.id);

                      return (
                        <div
                          key={tx.id}
                          className={`rounded-lg flex flex-col items-center justify-center text-center ${isFlagged ? "ring-2 ring-destructive" : ""}`}
                          style={{
                            backgroundColor: isFlagged ? "#FEE2E2" : style.bg,
                            color: isFlagged ? "#991B1B" : style.text,
                            padding: "3px 4px",
                            height: "36px",
                          }}
                          title={`${category}: ${tx.description} — ${getUnitsLabel(tx)} • ${formatAmount(tx.amount)}`}
                        >
                          <span className="text-[11px] font-bold leading-[1.1]">{style.code}</span>
                          <span className="text-[11px] font-semibold leading-[1.1] truncate max-w-full">{getUnitsLabel(tx)} • {formatAmount(tx.amount)}</span>
                        </div>
                      );
                    })}

                    {overflow > 0 && (
                      <div
                        className="rounded-lg flex items-center justify-center text-center bg-muted"
                        style={{ height: "36px", padding: "3px 4px" }}
                      >
                        <span className="text-[11px] font-bold text-muted-foreground">+{overflow}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[12px] no-print">
        <span className="text-muted-foreground font-medium mr-1">Legend:</span>
        {Object.entries(CATEGORY_STYLE).map(([cat, s]) => (
          <span key={cat} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: s.bg, border: `1px solid ${s.text}40` }} />
            <span className="font-medium">{s.code}</span>
            <span className="text-muted-foreground">= {cat}</span>
          </span>
        ))}
      </div>

      {/* Day detail overlay */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedDay(null)}>
          <div
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {format(new Date(selectedDay), "EEEE, MMMM d, yyyy")}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {selectedDayTx.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions on this date</p>
            ) : (
              <div className="space-y-2">
                {selectedDayTx.map((tx) => {
                  const { category } = categorizeTransaction(tx.description);
                  const style = getStyle(category);
                  const isFlagged = flaggedIds.has(tx.id);
                  return (
                    <div
                      key={tx.id}
                      className={`flex items-center gap-3 rounded-xl p-3 ${isFlagged ? "ring-2 ring-destructive" : ""}`}
                      style={{ backgroundColor: isFlagged ? "#FEE2E2" : style.bg }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-bold shrink-0"
                        style={{ backgroundColor: `${style.text}20`, color: style.text }}
                      >
                        {style.code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-foreground truncate">{tx.description}</p>
                        <p className="text-[12px] text-muted-foreground">{category}</p>
                      </div>
                      <span
                        className="text-[15px] font-bold shrink-0"
                        style={{ color: isFlagged ? "#991B1B" : style.text }}
                      >
                        {formatAmount(tx.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionCalendar;
