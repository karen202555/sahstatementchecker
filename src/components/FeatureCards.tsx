import { FileText, Sparkles, Download } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Smart Processing",
    description: "Upload PDFs, CSVs or TXT — transactions extracted instantly",
  },
  {
    icon: Sparkles,
    title: "Overcharge Detector",
    description: "Flags duplicates, unusual charges & fee changes automatically",
  },
  {
    icon: Download,
    title: "Export & Share",
    description: "Download to Excel or print your results",
  },
];

const FeatureCards = () => {
  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-3 gap-6">
      {features.map((feature) => (
        <div key={feature.title} className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <feature.icon className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>
        </div>
      ))}
    </div>
  );
};

export default FeatureCards;
