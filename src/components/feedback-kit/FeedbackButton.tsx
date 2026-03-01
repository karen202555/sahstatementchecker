import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import FeedbackModal from "./FeedbackModal";

const FeedbackButton = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 gap-2 rounded-full shadow-lg h-11 px-5 text-sm font-medium"
        size="sm"
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </Button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
};

export default FeedbackButton;
