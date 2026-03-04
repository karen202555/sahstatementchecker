import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import type { FeedbackEntry, AdminMeta } from "@/pages/AdminFeedback";

const TRIAGE_STATUSES = [
  "New", "Needs Triage", "Accepted", "In Progress",
  "Waiting on User", "Blocked", "Duplicate", "Won't Fix", "Released", "Resolved",
];
const SEVERITIES = ["S1 Critical", "S2 High", "S3 Medium", "S4 Low"];

interface Props {
  entry: FeedbackEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, meta: AdminMeta) => Promise<boolean>;
  onSaveAndNext: (currentId: string) => void;
}

export default function AdminTriageDrawer({ entry, open, onOpenChange, onSave, onSaveAndNext }: Props) {
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setMeta({ ...entry.admin_meta });
    } else {
      setMeta(null);
    }
  }, [entry]);

  useEffect(() => {
    if (!entry?.screenshot_path) {
      setAttachmentUrl(null);
      return;
    }
    supabase.storage
      .from("feedback-uploads")
      .createSignedUrl(entry.screenshot_path, 3600)
      .then(({ data }) => setAttachmentUrl(data?.signedUrl ?? null));
  }, [entry?.screenshot_path]);

  if (!entry || !meta) return null;

  const updateField = (field: keyof AdminMeta, value: any) => {
    setMeta((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const validate = (): boolean => {
    if ((meta.triage_status === "Released" || meta.triage_status === "Resolved") && !meta.resolution_summary.trim()) {
      toast({ title: "Resolution summary required", description: `Status "${meta.triage_status}" requires a resolution summary.`, variant: "destructive" });
      return false;
    }
    if (meta.triage_status === "Duplicate" && !meta.admin_notes.toLowerCase().includes("duplicate of")) {
      toast({ title: "Missing duplicate reference", description: "Admin notes should include 'Duplicate of FEEDBACK_ID: ...'", variant: "default" });
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const finalMeta = { ...meta };
    if (finalMeta.triage_status === "Resolved" && !finalMeta.resolved_at) {
      finalMeta.resolved_at = new Date().toISOString();
    }
    setSaving(true);
    const ok = await onSave(entry.id, finalMeta);
    setSaving(false);
    if (ok) toast({ title: "Saved" });
  };

  const handleSaveAndNext = async () => {
    if (!validate()) return;
    const finalMeta = { ...meta };
    if (finalMeta.triage_status === "Resolved" && !finalMeta.resolved_at) {
      finalMeta.resolved_at = new Date().toISOString();
    }
    setSaving(true);
    const ok = await onSave(entry.id, finalMeta);
    setSaving(false);
    if (ok) onSaveAndNext(entry.id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Triage</SheetTitle>
          <SheetDescription>
            {new Date(entry.created_at).toLocaleString()} · {entry.category ?? "Uncategorized"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Read-only details */}
          <div>
            <Label className="text-sm text-muted-foreground">Feedback ID</Label>
            <p className="text-xs font-mono mt-1 text-muted-foreground">{entry.id}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">User</Label>
            <p className="text-sm mt-1">{entry.user_email ?? entry.user_id}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Message</Label>
            <p className="text-sm mt-1 whitespace-pre-wrap">{entry.message}</p>
          </div>
          {attachmentUrl && (
            <div>
              <Label className="text-sm text-muted-foreground">Attachment</Label>
              <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline hover:text-primary/80 block mt-1">
                View attachment
              </a>
            </div>
          )}

          {/* Triage fields */}
          <div className="space-y-2">
            <Label>Triage Status</Label>
            <Select value={meta.triage_status} onValueChange={(v) => updateField("triage_status", v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIAGE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={meta.severity} onValueChange={(v) => updateField("severity", v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Input value={meta.assigned_to} onChange={(e) => updateField("assigned_to", e.target.value)} className="h-11" />
          </div>

          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={(meta.tags ?? []).join(", ")}
              onChange={(e) => updateField("tags", e.target.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))}
              className="h-11"
              placeholder="e.g. ui, performance"
            />
            {meta.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {meta.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Admin Notes</Label>
            <Textarea
              value={meta.admin_notes}
              onChange={(e) => updateField("admin_notes", e.target.value)}
              rows={3}
              placeholder="Internal notes..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Resolution Summary</Label>
            <Textarea
              value={meta.resolution_summary}
              onChange={(e) => updateField("resolution_summary", e.target.value)}
              rows={3}
              placeholder="Summary of resolution..."
              className="min-h-[80px]"
            />
          </div>

          {meta.resolved_at && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-muted-foreground">Resolved At</Label>
                <p className="text-sm mt-1">{new Date(meta.resolved_at).toLocaleString()}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => updateField("resolved_at", null)}>
                Clear
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={handleSaveAndNext} disabled={saving} className="flex-1">
              Save & Next
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
