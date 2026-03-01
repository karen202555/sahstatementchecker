import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ClipboardList, MessageSquare, Lock, Info, LogOut, UserPlus, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import appMetadata from "@/lib/app-metadata";
import AboutPanel from "./AboutPanel";
import FeedbackModal from "@/components/feedback-kit/FeedbackModal";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email ?? "?")[0].toUpperCase();
}

const UserMenu = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("admin_users" as any)
      .select("user_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        setIsAdmin(!error && !!data);
      });
  }, [user]);
  if (!user) return null;

  const displayName = profile?.display_name || user.email || "User";
  const initials = getInitials(profile?.display_name, user.email);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-9 px-2 focus-visible:ring-1">
            <Avatar className="h-7 w-7 text-xs">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium truncate max-w-[140px]">
              {displayName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[260px]" role="menu">
          {/* A) Identity */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium truncate">{displayName}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* B) Optional Primary Actions */}
          {appMetadata.feedbackEnabled && (
            <>
              <DropdownMenuItem role="menuitem" onClick={() => navigate("/my-feedback")}>
                <ClipboardList className="mr-2 h-4 w-4" />
                My Feedback
              </DropdownMenuItem>
              <DropdownMenuItem role="menuitem" onClick={() => setFeedbackOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Provide Feedback
              </DropdownMenuItem>
            </>
          )}

          {appMetadata.profilesEnabled && (
            <DropdownMenuItem role="menuitem" disabled>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Profile
            </DropdownMenuItem>
          )}

          {(appMetadata.feedbackEnabled || appMetadata.profilesEnabled || isAdmin) && (
            <DropdownMenuSeparator />
          )}

          {isAdmin && (
            <DropdownMenuItem role="menuitem" onClick={() => navigate("/admin/feedback")}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin: All Feedback
            </DropdownMenuItem>
          )}

          {isAdmin && <DropdownMenuSeparator />}

          {/* C) Account */}
          <DropdownMenuItem role="menuitem" onClick={() => navigate("/account/password")}>
            <Lock className="mr-2 h-4 w-4" />
            Update Password
          </DropdownMenuItem>

          {/* D) App Info */}
          <DropdownMenuItem role="menuitem" onClick={() => setAboutOpen(true)}>
            <Info className="mr-2 h-4 w-4" />
            About this app
          </DropdownMenuItem>

          {/* E) Session */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            role="menuitem"
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutPanel
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        onProvideFeedback={() => {
          setAboutOpen(false);
          setFeedbackOpen(true);
        }}
      />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
};

export default UserMenu;
