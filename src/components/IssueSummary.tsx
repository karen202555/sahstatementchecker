import { AlertTriangle, Copy, DollarSign, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Transaction } from "@/lib/transactions";
import { detectOvercharges, getAlertSummary, type ManagementMode } from "@/lib/overcharge-detector";

interface Props {
  transactions: Transaction[];
  managementMode: ManagementMode;
}

const IssueSummary = ({ transactions, managementMode }: Props) => {
  const alerts = detectOvercharges(transactions, { managementMode });
  const summary = getAlertSummary(alerts);
  const total = summary.duplicates + summary.anomalies + summary.feeIssues;

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Statement Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold text-foreground">{transactions.length}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-lg font-bold text-foreground">{summary.duplicates}</p>
              <p className="text-xs text-muted-foreground">Possible duplicates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-lg font-bold text-foreground">{summary.anomalies}</p>
              <p className="text-xs text-muted-foreground">Possible anomalies</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-lg font-bold text-foreground">{summary.feeIssues}</p>
              <p className="text-xs text-muted-foreground">Fee issues</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IssueSummary;
