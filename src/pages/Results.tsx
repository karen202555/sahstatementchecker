import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Table as TableIcon, CalendarDays, Download, Printer, PieChart, ShieldAlert, Share2, FileDown } from "lucide-react";
import Header from "@/components/Header";
import TransactionsTable from "@/components/TransactionsTable";
import TransactionCalendar from "@/components/TransactionCalendar";
import SpendingSummary from "@/components/SpendingSummary";
import OverchargeAlerts from "@/components/OverchargeAlerts";
import IssueSummary from "@/components/IssueSummary";
import BetaFeedback from "@/components/BetaFeedback";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getTransactions, type Transaction } from "@/lib/transactions";
import { toast } from "@/hooks/use-toast";
import { generatePdfReport } from "@/lib/pdf-report";

function exportToExcel(transactions: Transaction[]) {
  const header = "Date\tDescription\tAmount";
  const rows = transactions.map(
    (tx) => `${tx.date}\t${tx.description}\t${tx.amount.toFixed(2)}`
  );
  const tsv = [header, ...rows].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + tsv], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.xls";
  a.click();
  URL.revokeObjectURL(url);
}

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    getTransactions(sessionId).then((data) => {
      setTransactions(data);
      setLoading(false);
    });
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between no-print">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 text-base">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-base text-muted-foreground">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} found
            </span>
            {transactions.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: "Link copied!", description: "Share this link with family or advocates." });
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToExcel(transactions)}>
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => generatePdfReport(transactions)}>
                  <FileDown className="h-4 w-4" />
                  PDF Report
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Issue summary panel */}
            {transactions.length > 0 && (
              <div className="no-print">
                <IssueSummary transactions={transactions} />
              </div>
            )}

            <Tabs defaultValue="calendar">
              <TabsList className="mb-6 no-print">
                <TabsTrigger value="table" className="gap-2 text-base">
                  <TableIcon className="h-4 w-4" />
                  Table
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2 text-base">
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="summary" className="gap-2 text-base">
                  <PieChart className="h-4 w-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="alerts" className="gap-2 text-base">
                  <ShieldAlert className="h-4 w-4" />
                  Alerts
                </TabsTrigger>
              </TabsList>
              <TabsContent value="table">
                <TransactionsTable transactions={transactions} />
              </TabsContent>
              <TabsContent value="calendar">
                <TransactionCalendar transactions={transactions} />
              </TabsContent>
              <TabsContent value="summary">
                <SpendingSummary transactions={transactions} />
              </TabsContent>
              <TabsContent value="alerts">
                <OverchargeAlerts transactions={transactions} />
              </TabsContent>
            </Tabs>

            {/* Beta feedback */}
            {sessionId && (
              <div className="no-print">
                <BetaFeedback sessionId={sessionId} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Results;
