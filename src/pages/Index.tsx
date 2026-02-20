
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

      <main className="container mx-auto px-6 py-4">
        <div className="flex flex-col items-center gap-6">
          {/* Headline */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Don't get{" "}
              <span className="text-primary">overcharged</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">
              Upload your Support at Home provider statements and instantly see every transaction in a calendar view, spending breakdown, and overcharge alerts.
            </p>
          </div>

          {/* Dropzone */}
          <FileDropzone />

          {/* Statement history for logged-in users */}
          {user && <StatementHistory />}

          {/* Features */}
          <FeatureCards />
        </div>
      </main>
    </div>
  );
};

export default Index;
