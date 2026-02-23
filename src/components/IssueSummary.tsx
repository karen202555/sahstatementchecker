import { AlertTriangle, Copy, DollarSign, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Transaction } from "@/lib/transactions";
import { detectOvercharges, getAlertSummary } from "@/lib/overcharge-detector";

interface Props {
  transactions: Transaction[];
}

const IssueSummary = ({ transactions }: Props) => {
  const alerts = detectOvercharges(transactions);
  const summary = getAlertSummary(alerts);

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <h3 className="text-base font-semibold text-foreground mb-3">Statement Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{transactions.length}</p>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-xl font-bold text-foreground">{summary.duplicates}</p>
              <p className="text-sm text-muted-foreground">Possible duplicates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-xl font-bold text-foreground">{summary.anomalies}</p>
              <p className="text-sm text-muted-foreground">Possible anomalies</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-xl font-bold text-foreground">{summary.feeIssues}</p>
              <p className="text-sm text-muted-foreground">Fee issues</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IssueSummary;
