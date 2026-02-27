import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Upload, X, MessageSquare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const { user } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setMessage("");
    setCategory("");
    setPriority("Medium");
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async () => {
    if (!message.trim() || !category || !user) return;
    setSubmitting(true);

    try {
      const { data: fbRow, error: insertError } = await supabase
        .from("feedback" as any)
        .insert({
          reporter_user_id: user.id,
          reporter_email: user.email ?? null,
          page_url: location.pathname + location.search,
          feedback_type: category,
          message: message.trim(),
          priority: priority || null,
          version: APP_VERSION,
        } as any)
        .select("id")
        .single();

      if (insertError) throw insertError;
      const feedbackId = (fbRow as any).id;

      // Upload screenshot if present
      if (screenshot) {
        const path = `${user.id}/${feedbackId}/${Date.now()}-${screenshot.name}`;
        const { error: uploadError } = await supabase.storage
          .from("feedback-uploads")
          .upload(path, screenshot);
        if (!uploadError) {
          await supabase
            .from("feedback" as any)
            .update({ attachments: [path] } as any)
            .eq("id", feedbackId);
        }
      }

      resetForm();
      onOpenChange(false);
      toast({ title: "Thank you. Your feedback helps improve Statement Checker." });
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      toast({ title: "Failed to submit feedback", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Provide Feedback
          </SheetTitle>
          <SheetDescription className="text-sm">
            Statement Checker is improving rapidly. Your feedback helps us fix issues and improve the experience.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority (optional)</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="fb-message">Message *</Label>
            <Textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened or what you expected."
              rows={6}
              className="min-h-[150px]"
              maxLength={5000}
            />
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            {!screenshot ? (
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 mx-auto mb-1 opacity-50" />
                Click to upload an image (jpg, png, webp)
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={screenshotPreview!}
                  alt="Screenshot preview"
                  className="rounded border max-h-40 w-auto"
                />
                <button
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                  onClick={removeScreenshot}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !message.trim() || !category}
            className="w-full"
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FeedbackModal;
