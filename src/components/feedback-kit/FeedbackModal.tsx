import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Paperclip, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Something Broken",
  "Hard To Use",
  "Confusing",
  "Idea or Suggestion",
  "General Feedback",
];
const PRIORITIES = ["High", "Medium", "Low"];
const APP_VERSION = "v0.1 Beta";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackModal = ({ open, onOpenChange }: Props) => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General Feedback");
  const [priority, setPriority] = useState("Medium");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setMessage("");
    setCategory("General Feedback");
    setPriority("Medium");
    setFile(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && /\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
      setFile(f);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const pastedFile = item.getAsFile();
        if (pastedFile) {
          setFile(pastedFile);
        }
        break;
      }
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSubmitting(true);

    try {
      const { data: row, error: insertErr } = await supabase
        .from("feedback_entries" as any)
        .insert({
          user_id: user.id,
          user_email: user.email ?? null,
          display_name: profile?.display_name ?? null,
          route: location.pathname + location.search,
          screen_title: document.title,
          app_key: "statement-checker",
          app_version: APP_VERSION,
          user_agent: navigator.userAgent,
          category,
          priority,
          message: message.trim(),
        } as any)
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      const entryId = (row as any).id;

      if (file) {
        const ext = file.name.split(".").pop() ?? "png";
        const path = `${user.id}/${entryId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("feedback-uploads")
          .upload(path, file);

        if (!uploadErr) {
          await supabase
            .from("feedback_entries" as any)
            .update({ screenshot_path: path } as any)
            .eq("id", entryId);
        }
      }

      reset();
      onOpenChange(false);
      toast({ title: "Thank you — feedback submitted." });
    } catch (err: any) {
      console.error("Feedback error:", err);
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>
            Help us improve Statement Checker.
          </DialogDescription>
        </DialogHeader>

        {/* Category + Priority selects */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 min-h-0 py-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened? What did you expect?"
            className="min-h-[160px] resize-none"
            maxLength={5000}
          />
        </div>

        {/* Bottom bar: attach + send */}
        <div className="border-t pt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 relative"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach screenshot
            {file && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFile}
          />

          {file && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 max-w-[140px] truncate">
              {file.name}
              <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => setFile(null)} />
            </span>
          )}

          <div className="flex-1" />

          <Button
            size="sm"
            disabled={submitting || !message.trim()}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
