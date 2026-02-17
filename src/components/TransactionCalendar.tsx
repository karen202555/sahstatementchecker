import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Transaction } from "@/lib/transactions";
import { parse, isValid, format } from "date-fns";

interface TransactionCalendarProps {
  transactions: Transaction[];
}

function parseDate(dateStr: string): Date | null {
  const formats = ["yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "M/d/yyyy", "MM-dd-yyyy"];
  for (const fmt of formats) {
    const d = parse(dateStr, fmt, new Date());
    if (isValid(d)) return d;
  }
  const d = new Date(dateStr);
  return isValid(d) ? d : null;
}

const TransactionCalendar = ({ transactions }: TransactionCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

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

  const datesWithTx = useMemo(() => {
    return Array.from(txByDate.keys()).map((k) => new Date(k + "T00:00:00"));
  }, [txByDate]);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedTx = selectedKey ? txByDate.get(selectedKey) || [] : [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex justify-center rounded-xl border border-border bg-card p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{ hasTx: datesWithTx }}
          modifiersClassNames={{ hasTx: "bg-accent text-accent-foreground font-bold" }}
        />
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a date"}
        </h3>
        {selectedTx.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {selectedDate ? "No transactions on this date" : "Click a date to view transactions"}
          </p>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {selectedTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span className="text-sm text-foreground truncate mr-2">{tx.description}</span>
                  <Badge variant={tx.amount < 0 ? "destructive" : "default"} className="font-mono shrink-0">
                    {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default TransactionCalendar;
