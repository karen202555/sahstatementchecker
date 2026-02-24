import { AlertTriangle, Copy, DollarSign, Activity } from "lucide-react";
import type { Transaction } from "@/lib/transactions";
import { detectOvercharges, getAlertSummary } from "@/lib/overcharge-detector";

interface Props {
  transactions: Transaction[];
}

const IssueSummary = ({ transactions }: Props) => {
  const alerts = detectOvercharges(transactions);
  const summary = getAlertSummary(alerts);

  const items = [
    { icon: Activity, label: "Transactions", value: transactions.length, color: "text-foreground" },
    { icon: Copy, label: "Possible Duplicates", value: summary.duplicates, color: summary.duplicates > 0 ? "text-destructive" : "text-foreground" },
    { icon: AlertTriangle, label: "Possible Anomalies", value: summary.anomalies, color: summary.anomalies > 0 ? "text-destructive" : "text-foreground" },
    { icon: DollarSign, label: "Fee Issues", value: summary.feeIssues, color: summary.feeIssues > 0 ? "text-destructive" : "text-foreground" },
  ];

  return (
    <div className="flex items-center h-14 rounded-[10px] border border-border bg-card px-4 divide-x divide-border">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 px-4 first:pl-0 last:pr-0">
          <item.icon className={`h-4 w-4 opacity-70 ${item.color}`} />
          <span className={`text-[16px] font-semibold tabular-nums ${item.color}`}>{item.value}</span>
          <span className="text-[14px] font-medium text-muted-foreground whitespace-nowrap">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default IssueSummary;
