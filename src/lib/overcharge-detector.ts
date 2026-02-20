import type { Transaction } from "./transactions";

export interface Alert {
  type: "duplicate" | "unusual" | "changed";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  transactions: Transaction[];
}

export function detectOvercharges(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  alerts.push(...findDuplicates(transactions));
  alerts.push(...findUnusualAmounts(transactions));
  alerts.push(...findChangedFees(transactions));
  return alerts.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
}

function severityOrder(s: string): number {
  return s === "high" ? 0 : s === "medium" ? 1 : 2;
}

function normalize(desc: string): string {
  return desc.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function findDuplicates(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const seen = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const key = `${tx.date}|${Math.abs(tx.amount).toFixed(2)}|${normalize(tx.description)}`;
    const group = seen.get(key) || [];
    group.push(tx);
    seen.set(key, group);
  }

  for (const [, group] of seen) {
    if (group.length > 1) {
      alerts.push({
        type: "duplicate",
        severity: "high",
        title: `Duplicate charge: $${Math.abs(group[0].amount).toFixed(2)}`,
        description: `"${group[0].description}" appears ${group.length} times on ${group[0].date}`,
        transactions: group,
      });
    }
  }
  return alerts;
}

function findUnusualAmounts(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const amounts = transactions.map((tx) => Math.abs(tx.amount)).filter((a) => a > 0);
  if (amounts.length < 3) return alerts;

  const sorted = [...amounts].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const upperBound = q3 + 1.5 * iqr;

  for (const tx of transactions) {
    if (Math.abs(tx.amount) > upperBound && Math.abs(tx.amount) > 50) {
      alerts.push({
        type: "unusual",
        severity: "medium",
        title: `Unusually high: $${Math.abs(tx.amount).toFixed(2)}`,
        description: `"${tx.description}" on ${tx.date} is significantly higher than typical charges (upper range: $${upperBound.toFixed(2)})`,
        transactions: [tx],
      });
    }
  }
  return alerts;
}

function findChangedFees(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const byDescription = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const key = normalize(tx.description);
    const group = byDescription.get(key) || [];
    group.push(tx);
    byDescription.set(key, group);
  }

  for (const [, group] of byDescription) {
    if (group.length < 2) continue;
    const amounts = group.map((tx) => Math.abs(tx.amount));
    const uniqueAmounts = new Set(amounts.map((a) => a.toFixed(2)));
    if (uniqueAmounts.size > 1) {
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      const pctChange = ((max - min) / min) * 100;
      if (pctChange > 10 && max - min > 5) {
        alerts.push({
          type: "changed",
          severity: pctChange > 50 ? "high" : "medium",
          title: `Fee changed: $${min.toFixed(2)} → $${max.toFixed(2)}`,
          description: `"${group[0].description}" varies by ${pctChange.toFixed(0)}% across ${group.length} charges`,
          transactions: group.sort((a, b) => a.date.localeCompare(b.date)),
        });
      }
    }
  }
  return alerts;
}
