import { AlertTriangle, Copy, TrendingUp, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/lib/transactions";
import { detectOvercharges, type Alert } from "@/lib/overcharge-detector";

interface Props {
  transactions: Transaction[];
}

const iconMap = {
  duplicate: Copy,
  unusual: TrendingUp,
  changed: AlertTriangle,
};

const severityStyles = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-accent text-accent-foreground border-border",
  low: "bg-muted text-muted-foreground border-border",
};

const badgeVariant = {
  high: "destructive" as const,
  medium: "secondary" as const,
  low: "outline" as const,
};

const OverchargeAlerts = ({ transactions }: Props) => {
  const alerts = detectOvercharges(transactions);

  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <ShieldAlert className="h-10 w-10 text-primary" />
            <p className="text-lg font-semibold text-foreground">No issues detected</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              We checked for duplicate charges, unusual amounts, and fee changes. Everything looks good!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-semibold text-foreground">
              {alerts.length} potential issue{alerts.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {alerts.map((alert, i) => {
            const Icon = iconMap[alert.type];
            return (
              <Card key={i} className={`border ${severityStyles[alert.severity]}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <CardTitle className="text-sm font-semibold">{alert.title}</CardTitle>
                    </div>
                    <Badge variant={badgeVariant[alert.severity]} className="text-xs shrink-0">
                      {alert.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm opacity-80">{alert.description}</p>
                  {alert.transactions.length > 1 && (
                    <div className="mt-3 space-y-1">
                      {alert.transactions.slice(0, 5).map((tx, j) => (
                        <div key={j} className="flex justify-between text-xs opacity-70">
                          <span>{tx.date}</span>
                          <span>${Math.abs(tx.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
};

export default OverchargeAlerts;
