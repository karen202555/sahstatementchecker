import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";

interface FeedbackRow {
  id: string;
  created_at: string;
  reporter_user_id: string;
  reporter_email: string | null;
  page_url: string | null;
  feedback_type: string;
  message: string;
  priority: string | null;
  attachments: string[] | null;
  status: string;
  wants_reply: boolean;
  v1_go_live: boolean;
  internal_notes: string | null;
}

const STATUSES = ["New", "In Progress", "Resolved", "Closed", "Won't Fix"];
const FEEDBACK_TYPES = ["Bug", "Confusing", "Feature request", "Improvement idea", "General thought", "Love this ❤️", "Something feels off", "Other"];

const AdminFeedback = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Check admin
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

  // Fetch feedback
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
    if (filterType !== "all" && f.feedback_type !== filterType) return false;
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

  const getAttachmentUrl = (path: string) => {
    const { data } = supabase.storage.from("feedback-uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("feedback-uploads")
      .createSignedUrl(path, 3600);
    if (error || !data) return null;
    return data.signedUrl;
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
        <main className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You do not have admin access.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-5">
        <div className="flex items-center gap-4 mb-5">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Feedback Admin</h1>
          <span className="text-sm text-muted-foreground">{feedback.length} total</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {FEEDBACK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="None">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>V1</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No feedback found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => (
                    <TableRow
                      key={f.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(f.id)}
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(f.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{f.feedback_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">{f.message}</TableCell>
                      <TableCell>
                        {f.priority ? (
                          <Badge variant={f.priority === "High" ? "destructive" : "outline"} className="text-xs">
                            {f.priority}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{f.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {f.v1_go_live ? "✅" : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-5">
                  {/* Message */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{selected.message}</p>
                  </div>

                  {/* Page URL */}
                  {selected.page_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Page URL</Label>
                      <p className="text-sm mt-1 font-mono">{selected.page_url}</p>
                    </div>
                  )}

                  {/* Reporter */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Reporter</Label>
                    <p className="text-sm mt-1">{selected.reporter_email ?? "Unknown"}</p>
                    {selected.wants_reply && (
                      <Badge variant="outline" className="mt-1 text-xs">Wants reply</Badge>
                    )}
                  </div>

                  {/* Attachments */}
                  {selected.attachments && selected.attachments.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Attachments</Label>
                      <div className="mt-1 space-y-2">
                        {selected.attachments.map((path, i) => (
                          <div key={i}>
                            {path.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                              <AttachmentImage path={path} />
                            ) : (
                              <Button
                                variant="link"
                                size="sm"
                                className="text-xs p-0 h-auto"
                                onClick={async () => {
                                  const url = await getSignedUrl(path);
                                  if (url) window.open(url, "_blank");
                                }}
                              >
                                {path.split("/").pop()}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Editable: Status */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selected.status}
                      onValueChange={(v) => updateField(selected.id, "status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Editable: V1 Go-Live */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="v1-go-live"
                      checked={selected.v1_go_live}
                      onCheckedChange={(c) => updateField(selected.id, "v1_go_live", !!c)}
                    />
                    <label htmlFor="v1-go-live" className="text-sm font-medium">
                      V1.0 Go-Live (Admin)
                    </label>
                  </div>

                  {/* Editable: Internal Notes */}
                  <div className="space-y-2">
                    <Label>Internal Notes</Label>
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

// Sub-component for image attachments with signed URLs
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
