import { useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeedbackModal from "./FeedbackModal";

const FeedbackButton = () => {
  const [open, setOpen] = useState(false);

  return createPortal(
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 2147483647,
        pointerEvents: "auto",
      }}
    >
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 rounded-full shadow-lg h-11 px-5 text-sm font-medium"
        size="sm"
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </Button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </div>,
    document.body
  );
};

export default FeedbackButton;
