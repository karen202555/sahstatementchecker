import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Settings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [profile]);

  async function handleSaveName() {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length > 100) {
      toast({ title: "Invalid name", description: "Display name must be 1-100 characters.", variant: "destructive" });
      return;
    }
    setSavingName(true);
    try {
      const { error: dbError } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", user!.id);
      if (dbError) throw dbError;
      await supabase.auth.updateUser({ data: { display_name: trimmed } });
      toast({ title: "Display name updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      <div className="max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Display Name</CardTitle>
            <CardDescription>This is how your name appears in the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Name</Label>
              <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} placeholder="Your display name" className="h-11" />
            </div>
            <Button onClick={handleSaveName} disabled={savingName} className="h-11 px-4 rounded-md">
              {savingName ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
