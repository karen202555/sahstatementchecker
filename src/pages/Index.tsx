import { Sparkles } from "lucide-react";
import Header from "@/components/Header";
import FileDropzone from "@/components/FileDropzone";
import FeatureCards from "@/components/FeatureCards";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-16">
        <div className="flex flex-col items-center gap-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Smart transaction parsing
            </span>
          </div>

          {/* Headline */}
          <div className="text-center">
            <p className="text-2xl font-semibold sm:text-3xl text-primary">
              Having trouble making sense of your home care statements?
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Turn statements into{" "}
              <span className="text-primary">a calendar view</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">Upload your provider home care statements and see the transactions in a clear calendar view. Make sure you are being charged for only what you received. 


            </p>
          </div>

          {/* Dropzone */}
          <FileDropzone />

          {/* Features */}
          <FeatureCards />
        </div>
      </main>
    </div>);

};

export default Index;