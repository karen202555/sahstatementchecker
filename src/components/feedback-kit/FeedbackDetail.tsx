import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Entry {
  id: string;
  message: string;
  category: string | null;
  priority: string | null;
  status: string;
  screenshot_path: string | null;
  route: string | null;
  app_version: string | null;
  created_at: string;
}

interface Props {
  entryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackDetail = ({ entryId, open, onOpenChange }: Props) => {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !entryId) return;
    (async () => {
      const { data } = await supabase
        .from("feedback_entries" as any)
        .select("*")
        .eq("id", entryId)
        .maybeSingle();

      const e = data as any as Entry | null;
      setEntry(e);

      if (e?.screenshot_path) {
        const { data: urlData } = await supabase.storage
          .from("feedback-uploads")
          .createSignedUrl(e.screenshot_path, 60 * 60 * 24); // 24h
        setSignedUrl(urlData?.signedUrl ?? null);
      }
    })();
  }, [entryId, open]);

  if (!entry) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Feedback Detail</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {new Date(entry.created_at).toLocaleString()}
            {entry.app_version && ` · ${entry.app_version}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex gap-2 flex-wrap">
            {entry.category && <Badge variant="outline">{entry.category}</Badge>}
            {entry.priority && <Badge variant="secondary">{entry.priority}</Badge>}
            <Badge variant={entry.status === "New" ? "default" : "secondary"}>
              {entry.status}
            </Badge>
          </div>

          <p className="text-sm whitespace-pre-wrap">{entry.message}</p>

          {entry.route && (
            <p className="text-xs text-muted-foreground">Page: {entry.route}</p>
          )}

          {signedUrl && (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open attachment
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDetail;
