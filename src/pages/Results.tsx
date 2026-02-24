import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Table as TableIcon, CalendarDays, Download, Printer, PieChart, ShieldAlert, Share2, FileDown, Eraser, AlertTriangle, Copy } from "lucide-react";
import Header from "@/components/Header";
import TransactionsTable from "@/components/TransactionsTable";
import TransactionCalendar from "@/components/TransactionCalendar";
import SpendingSummary from "@/components/SpendingSummary";
import OverchargeAlerts from "@/components/OverchargeAlerts";
import IssueSummary from "@/components/IssueSummary";
import BetaFeedback from "@/components/BetaFeedback";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getTransactions, type Transaction } from "@/lib/transactions";
import { toast } from "@/hooks/use-toast";
import { generatePdfReport } from "@/lib/pdf-report";
import { useDecisions } from "@/hooks/use-decisions";
import { generateDisputeReport, getDisputedTransactions } from "@/lib/dispute-report";

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
  const { decisions, setDecision, getSuggestion, clearMemory, isAuthenticated } = useDecisions(transactions);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);

  const disputedTxs = useMemo(
    () => getDisputedTransactions(transactions, decisions),
    [transactions, decisions]
  );
  const disputeReport = useMemo(
    () => generateDisputeReport(transactions, decisions),
    [transactions, decisions]
  );

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
                <Button variant="outline" size="sm" className="gap-2" onClick={() => generatePdfReport(transactions, decisions)}>
                  <FileDown className="h-4 w-4" />
                  PDF Report
                </Button>
                {disputedTxs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDisputeDialog(true)}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Export Disputes ({disputedTxs.length})
                  </Button>
                )}
                {isAuthenticated && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      clearMemory();
                      toast({ title: "Memory cleared", description: "Your saved preferences for recurring charges have been reset." });
                    }}
                  >
                    <Eraser className="h-4 w-4" />
                    Clear Memory
                  </Button>
                )}
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
                <TransactionsTable
                  transactions={transactions}
                  decisions={decisions}
                  onDecision={setDecision}
                  getSuggestion={getSuggestion}
                  isAuthenticated={isAuthenticated}
                />
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
        {/* Dispute export dialog */}
        <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-xl">Disputed Transactions</DialogTitle>
              <DialogDescription>
                Copy this text and paste it into an email to your provider or plan manager.
              </DialogDescription>
            </DialogHeader>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-md overflow-y-auto max-h-[50vh] border">
              {disputeReport}
            </pre>
            <Button
              size="lg"
              className="w-full gap-2 text-base"
              onClick={() => {
                navigator.clipboard.writeText(disputeReport);
                toast({ title: "Copied!", description: "Dispute summary copied to clipboard. Paste it into your email." });
              }}
            >
              <Copy className="h-5 w-5" />
              Copy to Clipboard
            </Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Results;
