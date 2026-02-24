import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Transaction } from "./transactions";
import type { TransactionDecision } from "@/hooks/use-decisions";
import { getCategorySummary } from "./categorize";
import { detectOvercharges } from "./overcharge-detector";

export function generatePdfReport(
  transactions: Transaction[],
  decisions?: Map<string, TransactionDecision>
) {
  const doc = new jsPDF();
  const categories = getCategorySummary(transactions);
  const alerts = detectOvercharges(transactions);
  const grandTotal = categories.reduce((sum, c) => sum + c.total, 0);

  const dates = transactions.map((t) => t.date).sort();
  const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : "N/A";

  let y = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Statement Analysis Report", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleDateString("en-AU")} · Period: ${dateRange}`, 14, y);
  doc.text(`${transactions.length} transactions · Total: $${grandTotal.toFixed(2)}`, 14, y + 5);
  y += 15;
  doc.setTextColor(0);

  // Divider
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  y += 8;

  // Category Summary
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Spending by Category", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Category", "Transactions", "Total", "% of Spend"]],
    body: categories.map((c) => [
      c.category,
      c.count.toString(),
      `$${c.total.toFixed(2)}`,
      `${((c.total / grandTotal) * 100).toFixed(1)}%`,
    ]),
    foot: [["Total", transactions.length.toString(), `$${grandTotal.toFixed(2)}`, "100%"]],
    theme: "grid",
    headStyles: { fillColor: [39, 157, 130], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Alerts Section
  if (alerts.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 30, 30);
    doc.text(`${alerts.length} Potential Issue${alerts.length !== 1 ? "s" : ""} Detected`, 14, y);
    doc.setTextColor(0);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Severity", "Type", "Issue", "Details"]],
      body: alerts.map((a) => [
        a.severity.toUpperCase(),
        a.type,
        a.title,
        a.description,
      ]),
      theme: "grid",
      headStyles: { fillColor: [200, 50, 50], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 22 },
        2: { cellWidth: 50 },
        3: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 0) {
          const val = data.cell.raw;
          if (val === "HIGH") data.cell.styles.textColor = [180, 30, 30];
          else if (val === "MEDIUM") data.cell.styles.textColor = [180, 120, 0];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Disputed Transactions Section
  const disputed = decisions
    ? transactions.filter((tx) => decisions.get(tx.id)?.decision === "dispute")
    : [];

  if (disputed.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }

    const disputeTotal = disputed.reduce((s, tx) => s + tx.amount, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 30, 30);
    doc.text(`${disputed.length} Disputed Transaction${disputed.length !== 1 ? "s" : ""} ($${disputeTotal.toFixed(2)})`, 14, y);
    doc.setTextColor(0);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Description", "Amount", "Reason"]],
      body: disputed.map((tx) => {
        const note = decisions!.get(tx.id)?.note?.trim() || "(no reason provided)";
        return [tx.date, tx.description, `$${tx.amount.toFixed(2)}`, note];
      }),
      theme: "grid",
      headStyles: { fillColor: [200, 50, 50], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 28 },
        2: { cellWidth: 25, halign: "right" },
        3: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // All Transactions
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("All Transactions", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Date", "Description", "Amount"]],
    body: transactions.map((tx) => [
      tx.date,
      tx.description,
      `$${tx.amount.toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [39, 157, 130], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { cellWidth: 25, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Statement Checker · Page ${i} of ${pageCount}`, 14, 290);
  }

  doc.save("statement-report.pdf");
}
