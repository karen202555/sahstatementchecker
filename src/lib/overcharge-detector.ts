import { parse, isValid } from "date-fns";
import type { Transaction } from "./transactions";

export type ManagementMode = "provider" | "self";

export interface Alert {
  type: "duplicate" | "unusual" | "changed" | "management-fee";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  transactions: Transaction[];
}

export interface DetectionOptions {
  managementMode?: ManagementMode;
}

export function detectOvercharges(
  transactions: Transaction[],
  options: DetectionOptions = {}
): Alert[] {
  const alerts: Alert[] = [];
  alerts.push(...findDuplicates(transactions));
  alerts.push(...findUnusualAmounts(transactions));
  alerts.push(...findChangedFees(transactions));
  alerts.push(...findManagementFees(transactions, options.managementMode ?? "self"));
  return alerts.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
}

export function getAlertSummary(alerts: Alert[]) {
  return {
    duplicates: alerts.filter((a) => a.type === "duplicate").length,
    anomalies: alerts.filter((a) => a.type === "unusual" || a.type === "changed").length,
    feeIssues: alerts.filter((a) => a.type === "management-fee").length,
  };
}

function severityOrder(s: string): number {
  return s === "high" ? 0 : s === "medium" ? 1 : 2;
}

function normalize(desc: string): string {
  return desc.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Simple fuzzy similarity — ratio of shared trigrams */
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 3 || nb.length < 3) return na === nb ? 1 : 0;
  const trigramsA = new Set<string>();
  for (let i = 0; i <= na.length - 3; i++) trigramsA.add(na.slice(i, i + 3));
  let shared = 0;
  for (let i = 0; i <= nb.length - 3; i++) {
    if (trigramsA.has(nb.slice(i, i + 3))) shared++;
  }
  const total = Math.max(trigramsA.size, nb.length - 2);
  return total === 0 ? 0 : shared / total;
}

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

function daysBetween(dateA: string, dateB: string): number {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  if (!a || !b) return Infinity;
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function amountsClose(a: number, b: number, tolerance = 0.5): boolean {
  return Math.abs(Math.abs(a) - Math.abs(b)) <= tolerance;
}

// --------------- duplicate detection ---------------

function findDuplicates(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const flagged = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const a = transactions[i];
      const b = transactions[j];
      if (flagged.has(`${i}-${j}`)) continue;

      const sim = similarity(a.description, b.description);
      const close = amountsClose(a.amount, b.amount);
      const days = daysBetween(a.date, b.date);

      let isDuplicate = false;
      let reason = "";

      // Same date + same amount + similar description (fuzzy ≥0.6)
      if (a.date === b.date && close && sim >= 0.6) {
        isDuplicate = true;
        reason = `Similar charge on ${a.date} for ~$${Math.abs(a.amount).toFixed(2)}`;
      }
      // Same description + same amount within 1–3 days
      else if (sim >= 0.8 && close && days >= 1 && days <= 3) {
        isDuplicate = true;
        reason = `Similar charge detected ${days} day${days > 1 ? "s" : ""} apart for ~$${Math.abs(a.amount).toFixed(2)}`;
      }
      // Same service type repeated on same day with similar amount
      else if (a.date === b.date && sim >= 0.85 && close) {
        isDuplicate = true;
        reason = `Same service appears twice on ${a.date}`;
      }

      if (isDuplicate) {
        flagged.add(`${i}-${j}`);
        alerts.push({
          type: "duplicate",
          severity: "high",
          title: `Possible Duplicate: $${Math.abs(a.amount).toFixed(2)}`,
          description: reason,
          transactions: [a, b],
        });
      }
    }
  }

  return alerts;
}

// --------------- unusual amounts ---------------

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

// --------------- changed fees ---------------

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

// --------------- 10% management fee check ---------------

const MANAGEMENT_KEYWORDS = [
  "admin",
  "management",
  "package management",
  "on-cost",
  "oncost",
  "on cost",
  "coordination",
  "care coordination",
  "case management",
];

function isManagementLine(description: string): boolean {
  const norm = normalize(description);
  return MANAGEMENT_KEYWORDS.some((kw) => norm.includes(kw));
}

function findManagementFees(transactions: Transaction[], mode: ManagementMode): Alert[] {
  const alerts: Alert[] = [];
  const mgmtLines = transactions.filter((tx) => isManagementLine(tx.description) && tx.amount < 0);
  const serviceLines = transactions.filter((tx) => !isManagementLine(tx.description) && tx.amount < 0);

  if (mgmtLines.length === 0) return alerts;

  if (mode === "self") {
    // Self-managed: flag if management fees total > 10% of total services
    const totalService = serviceLines.reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const totalMgmt = mgmtLines.reduce((s, tx) => s + Math.abs(tx.amount), 0);

    if (totalService > 0 && totalMgmt > totalService * 0.1) {
      alerts.push({
        type: "management-fee",
        severity: "high",
        title: `Management Fee Above 10%`,
        description: `Total management/admin fees ($${totalMgmt.toFixed(2)}) exceed 10% of service charges ($${totalService.toFixed(2)}). Rate: ${((totalMgmt / totalService) * 100).toFixed(1)}%`,
        transactions: mgmtLines,
      });
    }

    // Also flag individual management lines that look excessive
    for (const tx of mgmtLines) {
      if (Math.abs(tx.amount) > 100) {
        const alreadyCovered = alerts.some((a) => a.type === "management-fee" && a.transactions.includes(tx));
        if (!alreadyCovered) {
          alerts.push({
            type: "management-fee",
            severity: "medium",
            title: `Admin charge: $${Math.abs(tx.amount).toFixed(2)}`,
            description: `"${tx.description}" on ${tx.date} — self-managed plans typically shouldn't incur management fees`,
            transactions: [tx],
          });
        }
      }
    }
  } else {
    // Provider-managed: only flag excessive individual admin lines
    for (const tx of mgmtLines) {
      const pctOfTotal = serviceLines.length > 0
        ? (Math.abs(tx.amount) / (serviceLines.reduce((s, t) => s + Math.abs(t.amount), 0) / serviceLines.length)) * 100
        : 0;
      if (Math.abs(tx.amount) > 200 || pctOfTotal > 50) {
        alerts.push({
          type: "management-fee",
          severity: "medium",
          title: `High admin charge: $${Math.abs(tx.amount).toFixed(2)}`,
          description: `"${tx.description}" on ${tx.date} appears unusually high for an admin/management line item`,
          transactions: [tx],
        });
      }
    }
  }

  return alerts;
}
