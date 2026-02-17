import { FileText, Sparkles, Download } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "PDF Parsing",
    description: "Extracts text from all pages of PDF statements",
  },
  {
    icon: Sparkles,
    title: "Smart Detection",
    description: "Auto-detects dates, amounts & filters non-transactions",
  },
  {
    icon: Download,
    title: "CSV Export",
    description: "Download ready for Google Sheets",
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
