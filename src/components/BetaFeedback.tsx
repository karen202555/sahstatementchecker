import { useState } from "react";
import { ThumbsUp, AlertCircle, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  sessionId: string;
}

type Rating = "accurate" | "missed" | "incorrect";

const options: { value: Rating; label: string; icon: typeof ThumbsUp }[] = [
  { value: "accurate", label: "Yes", icon: ThumbsUp },
  { value: "missed", label: "Some issues missed", icon: AlertCircle },
  { value: "incorrect", label: "Something flagged incorrectly", icon: XCircle },
];

const BetaFeedback = ({ sessionId }: Props) => {
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("beta_feedback" as any).insert({
        session_id: sessionId,
        rating,
        comment: comment.trim() || null,
        user_id: user?.id ?? null,
      } as any);
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Thanks for your feedback!" });
    } catch {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-border">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Thank you for helping us improve CareSense!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Was this analysis accurate?</p>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            const selected = rating === opt.value;
            return (
              <Button
                key={opt.value}
                variant={selected ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setRating(opt.value)}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </Button>
            );
          })}
        </div>
        {rating && rating !== "accurate" && (
          <Textarea
            placeholder="Tell us what was incorrect or missed."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        )}
        {rating && (
          <Button onClick={handleSubmit} disabled={submitting} size="sm" className="gap-2">
            <Send className="h-4 w-4" />
            Submit Feedback
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default BetaFeedback;
