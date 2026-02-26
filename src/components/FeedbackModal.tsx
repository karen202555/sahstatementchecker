import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Camera, Paperclip, X, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

const FEEDBACK_TYPES = [
  "Bug",
  "Confusing",
  "Feature request",
  "Improvement idea",
  "General thought",
  "Love this ❤️",
  "Something feels off",
  "Other",
];

const PRIORITIES = ["High", "Medium", "Low"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackModal = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [priority, setPriority] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setMessage("");
    setFeedbackType("");
    setPriority("");
    setWantsReply(false);
    setFiles([]);
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (f) => f.type.startsWith("image/") || f.type === "application/pdf"
      );
      setFiles((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "browser" } as any });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );
      const file = new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" });
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(blob));
    } catch {
      // User cancelled or not supported
      toast({ title: "Screenshot cancelled", description: "Screen capture was cancelled or is not supported.", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || !feedbackType || !user) return;
    setSubmitting(true);

    try {
      // 1. Insert feedback row to get the ID
      const { data: fbRow, error: insertError } = await supabase
        .from("feedback" as any)
        .insert({
          reporter_user_id: user.id,
          reporter_email: user.email ?? null,
          page_url: location.pathname + location.search,
          feedback_type: feedbackType,
          message: message.trim(),
          priority: priority || null,
          wants_reply: wantsReply,
        } as any)
        .select("id")
        .single();

      if (insertError) throw insertError;
      const feedbackId = (fbRow as any).id;

      // 2. Upload files
      const allFiles = [...files];
      if (screenshotFile) allFiles.push(screenshotFile);

      const uploadedPaths: string[] = [];
      for (const file of allFiles) {
        const path = `${user.id}/${feedbackId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("feedback-uploads")
          .upload(path, file);
        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }
        uploadedPaths.push(path);
      }

      // 3. Update feedback row with attachment paths
      if (uploadedPaths.length > 0) {
        await supabase
          .from("feedback" as any)
          .update({ attachments: uploadedPaths } as any)
          .eq("id", feedbackId);
      }

      resetForm();
      onOpenChange(false);
      toast({ title: "Thanks for the feedback. We're improving this daily." });
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      toast({ title: "Failed to submit feedback", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>
            Tell us what confused you, surprised you, annoyed you, or worked well.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="fb-message">What's on your mind? *</Label>
            <Textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your feedback..."
              rows={4}
              maxLength={5000}
            />
          </div>

          {/* Feedback type */}
          <div className="space-y-2">
            <Label>Feedback type *</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority (optional)</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 mx-auto mb-1 opacity-50" />
              Drag & drop images or PDFs, or click to browse
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-muted rounded px-2 py-1">
                    <span className="truncate flex-1">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="ml-2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Screenshot */}
            <Button variant="outline" size="sm" className="gap-2" onClick={handleScreenshot} type="button">
              <Camera className="h-4 w-4" />
              Capture screenshot
            </Button>

            {screenshotPreview && (
              <div className="relative mt-2">
                <img src={screenshotPreview} alt="Screenshot preview" className="rounded border max-h-32 w-auto" />
                <button
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                  onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Wants reply */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="wants-reply"
              checked={wantsReply}
              onCheckedChange={(c) => setWantsReply(!!c)}
            />
            <label htmlFor="wants-reply" className="text-sm">I'd like a reply</label>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !message.trim() || !feedbackType}
            className="w-full"
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
