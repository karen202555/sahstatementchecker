import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const AppFooter = () => {
  const { user } = useAuth();
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("app_meta")
      .select("value")
      .eq("key", "app_version")
      .single()
      .then(({ data }) => {
        if (data) setVersion(data.value);
      });
  }, [user]);

  if (!user || !version) return null;

  return (
    <footer className="py-4 text-center">
      <p className="text-xs text-muted-foreground">Statement Checker {version}</p>
    </footer>
  );
};

export default AppFooter;
