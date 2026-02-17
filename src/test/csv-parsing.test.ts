import { describe, it, expect } from "vitest";

// Test the CSV parsing logic extracted from the edge function
function parseCSV(text: string): { date: string; description: string; amount: number }[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('date') || header.includes('amount') || header.includes('description');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const transactions: { date: string; description: string; amount: number }[] = [];

  for (const line of dataLines) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;

    let date = '', description = '', amount = 0;

    for (const col of cols) {
      if (/\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(col)) {
        date = col;
      } else if (!isNaN(parseFloat(col.replace(/[$,]/g, ''))) && col.replace(/[$,\s]/g, '').match(/^-?\d+\.?\d*$/)) {
        amount = parseFloat(col.replace(/[$,]/g, ''));
      } else if (col.length > 2 && !date) {
        description = description ? description : col;
      }
    }

    if (!description) description = cols[1] || 'Unknown';
    if (!date) date = cols[0] || 'Unknown';
    if (amount === 0) {
      const lastNum = parseFloat(cols[cols.length - 1]?.replace(/[$,]/g, '') || '0');
      if (!isNaN(lastNum)) amount = lastNum;
    }

    if (date && description) {
      transactions.push({ date, description, amount });
    }
  }

  return transactions;
}

describe("CSV Parsing", () => {
  it("parses standard CSV with headers", () => {
    const csv = `Date,Description,Amount
2025-01-15,Grocery Store,-45.67
2025-01-16,Direct Deposit,2500.00
2025-01-17,Electric Bill,-120.50`;

    const result = parseCSV(csv);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: "2025-01-15", description: "Grocery Store", amount: -45.67 });
    expect(result[1]).toEqual({ date: "2025-01-16", description: "Direct Deposit", amount: 2500 });
    expect(result[2]).toEqual({ date: "2025-01-17", description: "Electric Bill", amount: -120.5 });
  });

  it("handles empty CSV", () => {
    expect(parseCSV("")).toHaveLength(0);
    expect(parseCSV("Date,Description,Amount")).toHaveLength(0);
  });

  it("parses CSV with slash dates", () => {
    const csv = `Date,Description,Amount
01/15/2025,Coffee Shop,-5.25`;

    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("01/15/2025");
    expect(result[0].amount).toBe(-5.25);
  });
});
