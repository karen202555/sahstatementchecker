import { useMemo } from "react";
import type { Transaction } from "@/lib/transactions";
import { categorizeTransaction } from "@/lib/categorize";

interface SAHStatementProps {
  transactions: Transaction[];
}

// Map app categories to SAH service types
const SAH_SERVICE_TYPES = [
  { label: "Nursing care", categories: ["Nursing"] },
  { label: "Allied health and other therapeutic services", categories: ["Allied Health", "Health & Medical"] },
  { label: "Personal care", categories: ["Personal Care", "Support Worker"] },
  { label: "Respite", categories: [] },
  { label: "Domestic assistance", categories: ["Domestic"] },
  { label: "Home maintenance and repairs", categories: ["Housing & Accommodation"] },
  { label: "Meals", categories: ["Meals"] },
  { label: "Community and social participation", categories: ["Community & Social"] },
  { label: "Transport", categories: ["Transport"] },
  { label: "Equipment and supplies", categories: ["Equipment & Supplies"] },
  { label: "Fees and administration", categories: ["Fees & Admin"] },
];

function formatAUD(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs % 1 === 0 ? `$${abs.toLocaleString("en-AU")}` : `$${abs.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n < 0 ? `-${formatted}` : formatted;
}

function getStatementPeriod(transactions: Transaction[]) {
  if (transactions.length === 0) return { start: "", end: "", monthLabel: "", quarterLabel: "" };
  const dates = transactions.map(t => t.date).filter(Boolean).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];
  const d = new Date(start + "T00:00:00");
  const monthLabel = d.toLocaleString("en-AU", { month: "long", year: "numeric" });
  const q = Math.ceil((d.getMonth() + 1) / 3);
  const qStart = new Date(d.getFullYear(), (q - 1) * 3, 1);
  const qEnd = new Date(d.getFullYear(), q * 3, 0);
  const quarterLabel = `${qStart.toLocaleDateString("en-AU", { month: "short", year: "numeric" })} – ${qEnd.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`;
  return { start, end, monthLabel, quarterLabel };
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("en-AU", { month: "short" })}`;
}

export default function SAHStatement({ transactions }: SAHStatementProps) {
  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.amount < 0);
    const income = transactions.filter(t => t.amount >= 0);

    const period = getStatementPeriod(transactions);

    // Service type summary
    const serviceMap = new Map<string, { cost: number; govtSub: number; clientCont: number }>();
    for (const tx of expenses) {
      const { category } = categorizeTransaction(tx.description);
      const sahType = SAH_SERVICE_TYPES.find(s => s.categories.includes(category));
      const label = sahType?.label || "Other services";
      const entry = serviceMap.get(label) || { cost: 0, govtSub: 0, clientCont: 0 };
      entry.cost += Math.abs(tx.amount);
      entry.govtSub += tx.govt_contribution ? Math.abs(tx.govt_contribution) : 0;
      entry.clientCont += tx.client_contribution ? Math.abs(tx.client_contribution) : 0;
      serviceMap.set(label, entry);
    }

    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalGovt = expenses.reduce((s, t) => s + (t.govt_contribution ? Math.abs(t.govt_contribution) : 0), 0);
    const totalClient = expenses.reduce((s, t) => s + (t.client_contribution ? Math.abs(t.client_contribution) : 0), 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);

    // Detailed expenses sorted by date
    const detailedExpenses = expenses
      .map(tx => {
        const { category } = categorizeTransaction(tx.description);
        return { ...tx, category };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period,
      serviceMap,
      totalExpenses,
      totalGovt,
      totalClient,
      totalIncome,
      detailedExpenses,
      income,
      expenses,
    };
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-[15px]">
        No transactions to display. Upload a statement to populate the SAH template.
      </div>
    );
  }

  const { period, serviceMap, totalExpenses, totalGovt, totalClient, totalIncome, detailedExpenses } = data;

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Header */}
      <div className="border rounded-[10px] p-4 bg-card">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Support at Home</p>
            <h2 className="text-[20px] font-semibold">Monthly Statement</h2>
          </div>
          <div className="text-right text-[13px] text-muted-foreground">
            <p>Statement period</p>
            <p className="font-medium text-foreground">{period.monthLabel}</p>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground">
          This is a reconstructed view based on your imported statement data.
        </p>
      </div>

      {/* Account Summary */}
      <div className="border rounded-[10px] p-4 bg-card">
        <h3 className="text-[16px] font-semibold mb-3">Account Summary</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[14px]">
          <SummaryRow label="Services delivered (incl. contributions)" value={formatAUD(-totalExpenses)} negative />
          <SummaryRow label="Total government subsidy" value={formatAUD(totalGovt)} />
          <SummaryRow label="Total client contribution" value={formatAUD(totalClient)} />
          {totalIncome > 0 && (
            <SummaryRow label="Income / credits received" value={formatAUD(totalIncome)} positive />
          )}
        </div>
      </div>

      {/* Service Type Summary */}
      <div className="border rounded-[10px] p-4 bg-card">
        <h3 className="text-[16px] font-semibold mb-3">Service Type Summary</h3>
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4 font-semibold text-[13px]">Service type</th>
              <th className="py-2 px-3 text-right font-semibold text-[13px]">Total cost</th>
              <th className="py-2 px-3 text-right font-semibold text-[13px]">Gov. subsidy</th>
              <th className="py-2 pl-3 text-right font-semibold text-[13px]">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {SAH_SERVICE_TYPES.map(st => {
              const entry = serviceMap.get(st.label);
              if (!entry || entry.cost === 0) return (
                <tr key={st.label} className="border-b border-border/50">
                  <td className="py-1.5 pr-4 text-muted-foreground">{st.label}</td>
                  <td className="py-1.5 px-3 text-right text-muted-foreground">–</td>
                  <td className="py-1.5 px-3 text-right text-muted-foreground">–</td>
                  <td className="py-1.5 pl-3 text-right text-muted-foreground">–</td>
                </tr>
              );
              return (
                <tr key={st.label} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">{st.label}</td>
                  <td className="py-1.5 px-3 text-right font-medium">{formatAUD(-entry.cost)}</td>
                  <td className="py-1.5 px-3 text-right">{entry.govtSub > 0 ? formatAUD(entry.govtSub) : "–"}</td>
                  <td className="py-1.5 pl-3 text-right">{entry.clientCont > 0 ? formatAUD(entry.clientCont) : "–"}</td>
                </tr>
              );
            })}
            {/* Other row */}
            {serviceMap.has("Other services") && (() => {
              const entry = serviceMap.get("Other services")!;
              return (
                <tr className="border-b border-border/50">
                  <td className="py-1.5 pr-4">Other services</td>
                  <td className="py-1.5 px-3 text-right font-medium">{formatAUD(-entry.cost)}</td>
                  <td className="py-1.5 px-3 text-right">{entry.govtSub > 0 ? formatAUD(entry.govtSub) : "–"}</td>
                  <td className="py-1.5 pl-3 text-right">{entry.clientCont > 0 ? formatAUD(entry.clientCont) : "–"}</td>
                </tr>
              );
            })()}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-2 pr-4">Total</td>
              <td className="py-2 px-3 text-right">{formatAUD(-totalExpenses)}</td>
              <td className="py-2 px-3 text-right">{totalGovt > 0 ? formatAUD(totalGovt) : "–"}</td>
              <td className="py-2 pl-3 text-right">{totalClient > 0 ? formatAUD(totalClient) : "–"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Detailed Expenses */}
      <div className="border rounded-[10px] p-4 bg-card">
        <h3 className="text-[16px] font-semibold mb-3">Detailed Expenses</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b text-left bg-muted/50">
                <th className="py-2 px-2 font-semibold">Date</th>
                <th className="py-2 px-2 font-semibold">Service</th>
                <th className="py-2 px-2 text-right font-semibold">Cost</th>
                <th className="py-2 px-2 text-right font-semibold">Gov. subsidy</th>
                <th className="py-2 px-2 text-right font-semibold">Contribution</th>
                <th className="py-2 px-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {detailedExpenses.map((tx) => (
                <tr key={tx.id} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-1.5 px-2 whitespace-nowrap">{formatDateShort(tx.date)}</td>
                  <td className="py-1.5 px-2 max-w-[320px]">{tx.description}</td>
                  <td className="py-1.5 px-2 text-right font-medium">{formatAUD(Math.abs(tx.amount))}</td>
                  <td className="py-1.5 px-2 text-right">
                    {tx.govt_contribution != null ? formatAUD(Math.abs(tx.govt_contribution)) : "–"}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    {tx.client_contribution != null ? formatAUD(Math.abs(tx.client_contribution)) : "–"}
                  </td>
                  <td className="py-1.5 px-2">
                    <StatusPill status={tx.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2 px-2" colSpan={2}>Total</td>
                <td className="py-2 px-2 text-right">{formatAUD(totalExpenses)}</td>
                <td className="py-2 px-2 text-right">{totalGovt > 0 ? formatAUD(totalGovt) : "–"}</td>
                <td className="py-2 px-2 text-right">{totalClient > 0 ? formatAUD(totalClient) : "–"}</td>
                <td className="py-2 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Income / Credits */}
      {data.income.length > 0 && (
        <div className="border rounded-[10px] p-4 bg-card">
          <h3 className="text-[16px] font-semibold mb-3">Income &amp; Credits</h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b text-left bg-muted/50">
                <th className="py-2 px-2 font-semibold">Date</th>
                <th className="py-2 px-2 font-semibold">Description</th>
                <th className="py-2 px-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.income.map(tx => (
                <tr key={tx.id} className="border-b border-border/40">
                  <td className="py-1.5 px-2 whitespace-nowrap">{formatDateShort(tx.date)}</td>
                  <td className="py-1.5 px-2">{tx.description}</td>
                  <td className="py-1.5 px-2 text-right font-medium text-emerald-600">{formatAUD(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2 px-2" colSpan={2}>Total income</td>
                <td className="py-2 px-2 text-right text-emerald-600">{formatAUD(totalIncome)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Footer note */}
      <div className="text-[12px] text-muted-foreground text-center py-2">
        This statement view is auto-generated from your uploaded data. Verify against your official provider statement.
      </div>
    </div>
  );
}

function SummaryRow({ label, value, negative, positive }: { label: string; value: string; negative?: boolean; positive?: boolean }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-medium ${negative ? "text-destructive" : positive ? "text-emerald-600" : ""}`}>
        {value}
      </span>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "new").toLowerCase();
  const styles: Record<string, string> = {
    new: "bg-muted text-muted-foreground",
    "in progress": "bg-blue-50 text-blue-700",
    resolved: "bg-emerald-50 text-emerald-700",
    escalated: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[s] || styles.new}`}>
      {status || "New"}
    </span>
  );
}
