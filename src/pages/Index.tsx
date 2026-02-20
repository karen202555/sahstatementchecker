
import Header from "@/components/Header";
import FileDropzone from "@/components/FileDropzone";
import FeatureCards from "@/components/FeatureCards";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-4">
        <div className="flex flex-col items-center gap-6">
          {/* Headline */}
          <div className="text-center">
            <p className="text-2xl font-bold text-primary sm:text-5xl">make sense of your support at home statements ..</p>
            <div className="mt-3" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-4xl">
              Turn statements into{" "}
              <span className="text-primary">a calendar view</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">Upload your provider statements and view the transactions clearly in a calendar view. 
Don't get overcharged! 

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