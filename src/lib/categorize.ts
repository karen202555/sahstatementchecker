import type { Transaction } from "./transactions";

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  color: string;
}

const CATEGORY_RULES: { category: string; keywords: string[]; color: string }[] = [
  { category: "Transport", keywords: ["transport", "taxi", "uber", "bus", "train", "fuel", "petrol", "car", "parking", "toll"], color: "hsl(168, 72%, 40%)" },
  { category: "Personal Care", keywords: ["personal care", "hygiene", "grooming", "hair", "salon", "beauty", "pharmacy", "chemist"], color: "hsl(220, 70%, 55%)" },
  { category: "Meals & Food", keywords: ["meal", "food", "lunch", "dinner", "breakfast", "catering", "grocery", "supermarket", "cafe", "restaurant"], color: "hsl(35, 85%, 55%)" },
  { category: "Housing & Accommodation", keywords: ["rent", "housing", "accommodation", "mortgage", "lease", "board", "lodging", "sil", "supported independent"], color: "hsl(280, 60%, 55%)" },
  { category: "Health & Medical", keywords: ["medical", "health", "doctor", "hospital", "dental", "physio", "therapy", "nurse", "clinical", "gp", "specialist"], color: "hsl(0, 70%, 55%)" },
  { category: "Community & Social", keywords: ["community", "social", "activity", "recreation", "excursion", "outing", "event", "group"], color: "hsl(140, 60%, 45%)" },
  { category: "Support Worker", keywords: ["support worker", "support staff", "attendant", "carer", "assistance", "aide"], color: "hsl(200, 70%, 50%)" },
  { category: "Fees & Admin", keywords: ["fee", "admin", "management", "plan management", "service fee", "charge", "commission", "invoice"], color: "hsl(45, 80%, 50%)" },
  { category: "Equipment & Supplies", keywords: ["equipment", "supplies", "consumable", "assistive", "device", "wheelchair", "continence"], color: "hsl(310, 50%, 50%)" },
];

export function categorizeTransaction(description: string): { category: string; color: string } {
  const lower = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { category: rule.category, color: rule.color };
    }
  }
  return { category: "Other", color: "hsl(215, 14%, 50%)" };
}

export function getCategorySummary(transactions: Transaction[]): CategorySummary[] {
  const map = new Map<string, { total: number; count: number; color: string }>();

  for (const tx of transactions) {
    const { category, color } = categorizeTransaction(tx.description);
    const entry = map.get(category) || { total: 0, count: 0, color };
    entry.total += Math.abs(tx.amount);
    entry.count += 1;
    map.set(category, entry);
  }

  return Array.from(map.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total);
}

export function getMonthlyTotals(transactions: Transaction[]): { month: string; total: number }[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    const month = tx.date.substring(0, 7); // yyyy-MM
    map.set(month, (map.get(month) || 0) + Math.abs(tx.amount));
  }
  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
