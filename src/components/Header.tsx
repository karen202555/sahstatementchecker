import { FileSpreadsheet, LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center justify-between gap-3 px-6 py-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-foreground">Statement Sense</span>
        </button>

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{profile?.display_name || user.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
