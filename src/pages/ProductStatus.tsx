import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, Lightbulb, XCircle, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Feature {
  id: string;
  feature_name: string;
  description: string | null;
  status: string;
  sort_order: number;
}

interface RecentChange {
  id: string;
  created_at: string;
  description: string;
}

interface KnownIssue {
  id: string;
  feedback_type: string;
  message: string;
  created_at: string;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "Live": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "In Development": return <Clock className="h-4 w-4 text-amber-500" />;
    case "Planned": return <Lightbulb className="h-4 w-4 text-blue-500" />;
    case "Removed": return <XCircle className="h-4 w-4 text-muted-foreground" />;
    default: return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Live": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "In Development": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "Planned": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Removed": return "bg-muted text-muted-foreground border-border";
    default: return "";
  }
};

const ProductStatus = () => {
  const navigate = useNavigate();
  const [version, setVersion] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [changes, setChanges] = useState<RecentChange[]>([]);
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [vRes, fRes, cRes, iRes] = await Promise.all([
        supabase.from("app_meta").select("value").eq("key", "app_version").single(),
        supabase.from("features").select("*").order("sort_order"),
        supabase.from("recent_changes").select("*").order("sort_order"),
        supabase.from("feedback").select("id, feedback_type, message, created_at")
          .in("status", ["New", "Reviewing", "Planned"])
          .eq("priority", "High")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (vRes.data) setVersion(vRes.data.value);
      if (fRes.data) setFeatures(fRes.data as Feature[]);
      if (cRes.data) setChanges(cRes.data as RecentChange[]);
      if (iRes.data) setIssues(iRes.data as KnownIssue[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Version Banner */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Product Status</h1>
          {version && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm">
              {version}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm -mt-4">
          Canonical reference for what Statement Checker does today.
        </p>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.length === 0 && <p className="text-sm text-muted-foreground">No features registered yet.</p>}
            {features.map((f) => (
              <div key={f.id} className="flex items-start gap-3 py-2 border-b last:border-0 border-border">
                <div className="mt-0.5">{statusIcon(f.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{f.feature_name}</span>
                    <Badge variant="outline" className={`text-xs ${statusBadgeClass(f.status)}`}>
                      {f.status}
                    </Badge>
                  </div>
                  {f.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {changes.length === 0 && <p className="text-sm text-muted-foreground">No changes recorded yet.</p>}
            {changes.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
                <span className="text-foreground">{c.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Known Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Known Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.length === 0 && (
              <p className="text-sm text-muted-foreground">No high-priority issues at the moment. 🎉</p>
            )}
            {issues.map((i) => (
              <div key={i.id} className="flex items-start gap-3 py-2 border-b last:border-0 border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{i.feedback_type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(i.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1 line-clamp-2">{i.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProductStatus;
