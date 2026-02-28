import { FileSpreadsheet, LogOut, Settings, User, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card h-14">
      <div className="container mx-auto flex items-center justify-between h-full px-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSpreadsheet className="h-4 w-4 opacity-70" />
          </div>
          <span className="text-[15px] font-semibold text-foreground">Statement Checker</span>
        </button>

        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
              <User className="h-4 w-4 opacity-70" />
              <span>{profile?.display_name || user.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/product-status")} title="Product Status" className="h-8 w-8">
              <Info className="h-4 w-4 opacity-70" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} title="Settings" className="h-8 w-8">
              <Settings className="h-4 w-4 opacity-70" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 h-8 text-[13px] font-medium">
              <LogOut className="h-4 w-4 opacity-70" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
