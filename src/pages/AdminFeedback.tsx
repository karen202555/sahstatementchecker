import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";

interface FeedbackRow {
  id: string;
  created_at: string;
  reporter_email: string | null;
  feedback_type: string;
  message: string;
  priority: string | null;
  attachments: string[] | null;
  status: string;
  internal_notes: string | null;
  version: string | null;
}

const STATUSES = ["New", "In Progress", "Resolved", "Closed", "Won't Fix"];
const CATEGORIES = ["Something Broken", "Hard To Use", "Confusing", "Idea or Suggestion", "General Feedback", "Bug", "Idea/Enhancement", "Something I love"];

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(rows: FeedbackRow[]) {
  const headers = ["id", "created_at", "reporter_email", "feedback_type", "priority", "message", "status", "version", "attachments"];
  const csvRows = [headers.join(",")];
  for (const r of rows) {
    csvRows.push(headers.map(h => {
      const val = h === "attachments" ? (r.attachments ?? []).join("; ") : (r[h as keyof FeedbackRow] ?? "");
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(","));
  }
  downloadFile(csvRows.join("\n"), `feedback-export-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
}

function exportJSON(rows: FeedbackRow[]) {
  downloadFile(JSON.stringify(rows, null, 2), `feedback-export-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
}

const AdminFeedback = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .from("admin_users" as any)
      .select("user_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        setIsAdmin(!error && !!data);
      });
  }, [user, authLoading]);

  useEffect(() => {
    if (isAdmin !== true) return;
    setLoading(true);
    supabase
      .from("feedback" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Error loading feedback", variant: "destructive" });
        } else {
          setFeedback((data as any[]) ?? []);
        }
        setLoading(false);
      });
  }, [isAdmin]);

  const selected = feedback.find((f) => f.id === selectedId) ?? null;

  const filtered = useMemo(() => feedback.filter((f) => {
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    if (filterCategory !== "all" && f.feedback_type !== filterCategory) return false;
    if (filterPriority !== "all" && (f.priority ?? "None") !== filterPriority) return false;
    if (searchText && !f.message.toLowerCase().includes(searchText.toLowerCase()) && !(f.reporter_email ?? "").toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  }), [feedback, filterStatus, filterCategory, filterPriority, searchText]);

  const updateField = async (id: string, field: string, value: any) => {
    const { error } = await supabase
      .from("feedback" as any)
      .update({ [field]: value } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
      return;
    }
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || isAdmin === false) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground mt-2">You do not have admin access.</p>
        <Button variant="outline" className="mt-4 h-11 px-4 rounded-md" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-6 space-y-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Feedback Admin</h1>
          <span className="text-sm text-muted-foreground">{feedback.length} total · {filtered.length} shown</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(filtered)}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportJSON(filtered)}>
            <Download className="h-3.5 w-3.5" /> JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feedback..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 w-[220px] h-11"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-11"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] h-11"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[160px] h-11"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attach</TableHead>
                  <TableHead>Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                      No feedback found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelectedId(f.id)}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(f.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate">
                        {f.reporter_email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{f.feedback_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {f.priority ? (
                          <Badge variant={f.priority === "High" ? "destructive" : "outline"} className="text-xs">
                            {f.priority}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm">{f.message}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{f.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {f.attachments && f.attachments.length > 0 ? `${f.attachments.length}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {f.version ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Feedback Detail</SheetTitle>
                <SheetDescription>
                  {new Date(selected.created_at).toLocaleString()} · {selected.feedback_type}
                  {selected.version && ` · ${selected.version}`}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div>
                  <Label className="text-sm text-muted-foreground">Message</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selected.message}</p>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Reporter</Label>
                  <p className="text-sm mt-1">{selected.reporter_email ?? "Unknown"}</p>
                </div>

                {selected.attachments && selected.attachments.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Attachments</Label>
                    <div className="mt-1 space-y-2">
                      {selected.attachments.map((path, i) => (
                        <AttachmentLink key={i} path={path} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selected.status} onValueChange={(v) => updateField(selected.id, "status", v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={selected.internal_notes ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFeedback((prev) =>
                        prev.map((f) => f.id === selected.id ? { ...f, internal_notes: val } : f)
                      );
                    }}
                    onBlur={() => updateField(selected.id, "internal_notes", selected.internal_notes)}
                    rows={4}
                    placeholder="Internal notes (not visible to users)..."
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

function AttachmentLink({ path, index }: { path: string; index: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("feedback-uploads")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data) setUrl(data.signedUrl);
      });
  }, [path]);

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary underline hover:text-primary/80"
    >
      View attachment {index + 1}
    </a>
  );
}

export default AdminFeedback;
