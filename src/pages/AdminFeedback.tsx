import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Search, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import AdminTriageDrawer from "@/components/feedback-kit/AdminTriageDrawer";

/* ── Types ── */

export interface AdminMeta {
  triage_status: string;
  severity: string;
  assigned_to: string;
  tags: string[];
  admin_notes: string;
  resolution_summary: string;
  resolved_at: string | null;
}

export interface FeedbackEntry {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string | null;
  display_name: string | null;
  app_key: string;
  app_version: string | null;
  category: string | null;
  priority: string | null;
  message: string;
  screenshot_path: string | null;
  route: string | null;
  screen_title: string | null;
  user_agent: string | null;
  status: string;
  admin_meta: AdminMeta;
}

const TRIAGE_STATUSES = [
  "New", "Needs Triage", "Accepted", "In Progress",
  "Waiting on User", "Blocked", "Duplicate", "Won't Fix", "Released", "Resolved",
];
const SEVERITIES = ["S1 Critical", "S2 High", "S3 Medium", "S4 Low"];
const CATEGORIES = ["General Feedback", "Bug", "Idea/Enhancement", "Confusing", "Something I love"];

export const DEFAULT_ADMIN_META: AdminMeta = {
  triage_status: "New",
  severity: "S4 Low",
  assigned_to: "Unassigned",
  tags: [],
  admin_notes: "",
  resolution_summary: "",
  resolved_at: null,
};

export function buildAdminMeta(raw: any, category?: string | null): AdminMeta {
  const base = { ...DEFAULT_ADMIN_META };
  if (category === "Bug") base.severity = "S3 Medium";
  if (!raw || typeof raw !== "object") return base;
  return {
    triage_status: raw.triage_status ?? base.triage_status,
    severity: raw.severity ?? base.severity,
    assigned_to: raw.assigned_to ?? base.assigned_to,
    tags: Array.isArray(raw.tags) ? raw.tags : base.tags,
    admin_notes: raw.admin_notes ?? base.admin_notes,
    resolution_summary: raw.resolution_summary ?? base.resolution_summary,
    resolved_at: raw.resolved_at ?? base.resolved_at,
  };
}

/* ── Export helpers ── */

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(val: string) {
  return `"${String(val).replace(/"/g, '""')}"`;
}

function exportCSV(rows: FeedbackEntry[]) {
  const headers = [
    "feedback_id", "created_at", "app_name", "user_email_or_id",
    "category", "triage_status", "severity", "assigned_to", "admin_tags",
    "message", "screenshot_url_or_key", "admin_notes", "resolution_summary", "resolved_at",
  ];
  const csvRows = [headers.join(",")];
  for (const r of rows) {
    const m = r.admin_meta;
    csvRows.push([
      csvEscape(r.id),
      csvEscape(r.created_at),
      csvEscape(r.app_key ?? ""),
      csvEscape(r.user_email ?? r.user_id),
      csvEscape(r.category ?? ""),
      csvEscape(m.triage_status),
      csvEscape(m.severity),
      csvEscape(m.assigned_to),
      csvEscape((m.tags ?? []).join(",")),
      csvEscape(r.message),
      csvEscape(r.screenshot_path ?? ""),
      csvEscape(m.admin_notes),
      csvEscape(m.resolution_summary),
      csvEscape(m.resolved_at ?? ""),
    ].join(","));
  }
  downloadFile(csvRows.join("\n"), `feedback_export_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
}

function exportJSON(rows: FeedbackEntry[]) {
  downloadFile(JSON.stringify(rows, null, 2), `feedback_export_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
}

/* ── Page ── */

const AdminFeedback = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [filterAttachment, setFilterAttachment] = useState("all");
  const [searchText, setSearchText] = useState("");

  // Admin check
  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        setIsAdmin(!error && !!data);
      });
  }, [user, authLoading]);

  // Load all feedback entries (admin RLS allows this)
  useEffect(() => {
    if (isAdmin !== true) return;
    setLoading(true);
    supabase
      .from("feedback_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Error loading feedback", variant: "destructive" });
        } else {
          const entries = ((data as any[]) ?? []).map((row: any) => ({
            ...row,
            admin_meta: buildAdminMeta(row.admin_meta, row.category),
          }));
          setFeedback(entries);
        }
        setLoading(false);
      });
  }, [isAdmin]);

  // Unique assigned_to values for filter
  const assignees = useMemo(() => {
    const set = new Set(feedback.map((f) => f.admin_meta.assigned_to));
    return Array.from(set).sort();
  }, [feedback]);

  const selected = feedback.find((f) => f.id === selectedId) ?? null;
  const selectedIndex = selected ? feedback.findIndex((f) => f.id === selectedId) : -1;

  const filtered = useMemo(() => feedback.filter((f) => {
    const m = f.admin_meta;
    if (filterStatus !== "all" && m.triage_status !== filterStatus) return false;
    if (filterSeverity !== "all" && m.severity !== filterSeverity) return false;
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    if (filterAssigned !== "all" && m.assigned_to !== filterAssigned) return false;
    if (filterAttachment === "yes" && !f.screenshot_path) return false;
    if (filterAttachment === "no" && f.screenshot_path) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const searchable = `${f.message} ${m.admin_notes} ${m.resolution_summary} ${f.user_email ?? ""}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  }), [feedback, filterStatus, filterSeverity, filterCategory, filterAssigned, filterAttachment, searchText]);

  const updateAdminMeta = useCallback(async (id: string, meta: AdminMeta) => {
    const { error } = await supabase
      .from("feedback_entries" as any)
      .update({ admin_meta: meta as any } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
      return false;
    }
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, admin_meta: meta } : f))
    );
    return true;
  }, []);

  const handleSaveAndNext = useCallback((currentId: string) => {
    const currentIdx = filtered.findIndex((f) => f.id === currentId);
    if (currentIdx >= 0 && currentIdx < filtered.length - 1) {
      setSelectedId(filtered[currentIdx + 1].id);
    } else {
      setSelectedId(null);
    }
  }, [filtered]);

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
    <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6 space-y-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">All Feedback (Admin)</h1>
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
          <Input placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9 w-[200px] h-11" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-11"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TRIAGE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[150px] h-11"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[170px] h-11"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssigned} onValueChange={setFilterAssigned}>
          <SelectTrigger className="w-[150px] h-11"><SelectValue placeholder="Assigned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {assignees.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAttachment} onValueChange={setFilterAttachment}>
          <SelectTrigger className="w-[150px] h-11"><SelectValue placeholder="Attachment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="yes">Has Attachment</SelectItem>
            <SelectItem value="no">No Attachment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Snippet</TableHead>
                  <TableHead className="w-[50px]">Attach</TableHead>
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
                  filtered.map((f) => {
                    const m = f.admin_meta;
                    return (
                      <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelectedId(f.id)}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(f.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate">
                          {f.user_email ?? f.user_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{f.category ?? "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={m.triage_status === "Resolved" || m.triage_status === "Released" ? "default" : "outline"}
                            className="text-xs"
                          >
                            {m.triage_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={m.severity === "S1 Critical" ? "destructive" : m.severity === "S2 High" ? "destructive" : "outline"}
                            className="text-xs"
                          >
                            {m.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.assigned_to}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{f.message.slice(0, 80)}</TableCell>
                        <TableCell>
                          {f.screenshot_path ? <Paperclip className="h-4 w-4 text-muted-foreground" /> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AdminTriageDrawer
        entry={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        onSave={updateAdminMeta}
        onSaveAndNext={handleSaveAndNext}
      />
    </div>
  );
};

export default AdminFeedback;
