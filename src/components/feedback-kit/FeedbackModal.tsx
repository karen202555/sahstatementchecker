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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["Bug", "Usability", "Confusing", "Idea", "General"];
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
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("Medium");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setMessage("");
    setCategory("General");
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

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSubmitting(true);

    try {
      // 1. Insert row
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

      // 2. Upload attachment if present
      if (file) {
        const path = `${user.id}/${entryId}/${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("feedback-uploads")
          .upload(path, file);

        if (!uploadErr) {
          // 3. Update screenshot_path
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
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve Statement Checker.
          </DialogDescription>
        </DialogHeader>

        {/* Message area */}
        <div className="flex-1 min-h-0 py-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened? What did you expect?"
            className="min-h-[180px] resize-none"
            maxLength={5000}
          />
        </div>

        {/* Sticky bottom details bar */}
        <div className="border-t pt-3 space-y-3">
          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <Badge
                key={c}
                variant={category === c ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setCategory(c)}
              >
                {c}
              </Badge>
            ))}
          </div>

          {/* Priority chips + attach + send */}
          <div className="flex items-center gap-2 flex-wrap">
            {PRIORITIES.map((p) => (
              <Badge
                key={p}
                variant={priority === p ? "secondary" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setPriority(p)}
              >
                {p}
              </Badge>
            ))}

            <div className="flex-1" />

            {/* Attach */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              {file && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
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
              <span className="text-xs text-muted-foreground flex items-center gap-1 max-w-[120px] truncate">
                {file.name}
                <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => setFile(null)} />
              </span>
            )}

            {/* Send */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
