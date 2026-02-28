import Header from "@/components/Header";
import FileDropzone from "@/components/FileDropzone";
import FeatureCards from "@/components/FeatureCards";
import StatementHistory from "@/components/StatementHistory";
import { useAuth } from "@/hooks/use-auth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1100px] px-4 md:px-6 py-6 space-y-6">
        {/* Headline */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Don't get{" "}
            <span className="text-primary">overcharged</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Upload your Support at Home provider statements and instantly see every transaction in a calendar view, spending breakdown, and overcharge alerts.
          </p>
        </div>

        {/* Dropzone */}
        <FileDropzone />

        {/* Statement history for logged-in users */}
        {user && <StatementHistory />}

        {/* Features */}
        <FeatureCards />
      </main>
    </div>
  );
};

export default Index;
