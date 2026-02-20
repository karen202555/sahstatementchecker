import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2, Calendar, BarChart2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserStatementFiles, deleteSession, deleteAllUserTransactions, type StatementFile } from "@/lib/transactions";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const StatementHistory = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<StatementFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getUserStatementFiles();
      setFiles(data);
    } catch (e: any) {
      toast({ title: "Error loading history", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(sessionId: string) {
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setFiles((prev) => prev.filter((f) => f.session_id !== sessionId));
      toast({ title: "Deleted", description: "Statement removed from your account." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearAll() {
    setClearingAll(true);
    try {
      await deleteAllUserTransactions();
      setFiles([]);
      toast({ title: "Cleared", description: "All statements removed from your account." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setClearingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) return null;

  // Group by session
  const sessions = new Map<string, StatementFile[]>();
  for (const f of files) {
    if (!sessions.has(f.session_id)) sessions.set(f.session_id, []);
    sessions.get(f.session_id)!.push(f);
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Your saved statements</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all statements?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove all uploaded statements from your account. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {clearingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clear all"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-2">
        {Array.from(sessions.entries()).map(([sessionId, sessionFiles]) => {
          const totalTx = sessionFiles.reduce((s, f) => s + f.transaction_count, 0);
          const uploadedAt = new Date(sessionFiles[0].uploaded_at).toLocaleDateString("en-AU", {
            day: "numeric", month: "short", year: "numeric",
          });

          return (
            <div key={sessionId} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {sessionFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{f.file_name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Uploaded {uploadedAt}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart2 className="h-3 w-3" />
                      {totalTx} transaction{totalTx !== 1 ? "s" : ""}
                    </span>
                    {sessionFiles[0].date_range && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {sessionFiles[0].date_range}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/results?session=${sessionId}`)}
                  >
                    View
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive px-2">
                        {deletingId === sessionId
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this statement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove {sessionFiles.length > 1 ? "these files" : `"${sessionFiles[0].file_name}"`} and all associated transactions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(sessionId)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatementHistory;
