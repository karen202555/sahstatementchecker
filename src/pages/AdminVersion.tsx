import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const AdminVersion = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [version, setVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const { data: adminData } = await supabase.rpc("is_admin", { _user_id: user.id });
      setIsAdmin(!!adminData);
      if (adminData) {
        const { data } = await supabase.from("app_meta").select("value").eq("key", "app_version").single();
        if (data) setVersion(data.value);
      }
      setLoading(false);
    }
    init();
  }, [user]);

  async function handleUpdate() {
    if (!version.trim()) {
      toast({ title: "Version required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_meta")
        .update({ value: version.trim() })
        .eq("key", "app_version");
      if (error) throw error;
      toast({ title: "Version Updated Successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground mt-2">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-6 space-y-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-2xl font-semibold text-foreground">Update Version</h1>

        <div className="max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Version Number</CardTitle>
              <CardDescription>Set the current app version displayed across the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. v0.1 Beta"
                  className="h-11"
                />
              </div>
              <Button onClick={handleUpdate} disabled={saving} className="h-11 px-4 rounded-md">
                {saving ? "Updating…" : "Update Version"}
              </Button>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default AdminVersion;
