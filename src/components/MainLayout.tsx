import { FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import UserMenu from "@/components/user-menu/UserMenu";
import FeedbackButton from "@/components/feedback-kit/FeedbackButton";

interface Props {
  children: React.ReactNode;
}

const MainLayout = ({ children }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card h-14 shrink-0">
        <div className="mx-auto max-w-[1100px] flex items-center justify-between h-full px-4 md:px-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Statement Checker</span>
          </button>

          <UserMenu />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <FeedbackButton />
    </div>
  );
};

export default MainLayout;
