import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import FeedbackDetail from "./FeedbackDetail";

interface FeedbackEntry {
  id: string;
  message: string;
  category: string | null;
  priority: string | null;
  status: string;
  screenshot_path: string | null;
  created_at: string;
}

const MyFeedbackList = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("feedback_entries" as any)
        .select("id, message, category, priority, status, screenshot_path, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setEntries((data as any as FeedbackEntry[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!entries.length) {
    return <p className="text-muted-foreground text-center py-12">No feedback submitted yet.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {entries.map((e) => (
          <Card
            key={e.id}
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedId(e.id)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">{e.message}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {e.category && (
                    <Badge variant="outline" className="text-xs">{e.category}</Badge>
                  )}
                  {e.priority && (
                    <Badge variant="secondary" className="text-xs">{e.priority}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.screenshot_path && <Paperclip className="h-4 w-4 text-muted-foreground" />}
                <Badge variant={e.status === "New" ? "default" : "secondary"} className="text-xs">
                  {e.status}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedId && (
        <FeedbackDetail
          entryId={selectedId}
          open={!!selectedId}
          onOpenChange={(o) => !o && setSelectedId(null)}
        />
      )}
    </>
  );
};

export default MyFeedbackList;
