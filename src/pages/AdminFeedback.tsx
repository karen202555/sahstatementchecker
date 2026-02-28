import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
const CATEGORIES = ["Something Broken", "Hard To Use", "Confusing", "Idea or Suggestion", "General Feedback"];

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

  const filtered = feedback.filter((f) => {
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    if (filterCategory !== "all" && f.feedback_type !== filterCategory) return false;
    if (filterPriority !== "all" && (f.priority ?? "None") !== filterPriority) return false;
    return true;
  });

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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-[1100px] px-4 md:px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground mt-2">You do not have admin access.</p>
          <Button variant="outline" className="mt-4 h-11 px-4 rounded-md" onClick={() => navigate("/")}>Go Home</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 md:px-6 py-6 space-y-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Feedback Admin</h1>
          <span className="text-sm text-muted-foreground">{feedback.length} total</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
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
                    <TableHead>Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
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
                          <AttachmentImage key={i} path={path} />
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
      </main>
    </div>
  );
};

function AttachmentImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("feedback-uploads")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data) setUrl(data.signedUrl);
      });
  }, [path]);

  if (!url) return <div className="h-20 w-20 bg-muted rounded animate-pulse" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt="Attachment" className="rounded border max-h-32 w-auto" />
    </a>
  );
}

export default AdminFeedback;
