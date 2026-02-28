import PublicLayout from "@/components/PublicLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Calendar, BarChart3, AlertTriangle, FileText, MessageSquare } from "lucide-react";

const features = [
  { icon: Upload, title: "Upload Statements", desc: "Upload provider statements in PDF, CSV, or text format." },
  { icon: Calendar, title: "Calendar View", desc: "Convert statements into a calendar view so you can quickly see what happened on each day." },
  { icon: BarChart3, title: "Transaction Analysis", desc: "Automatically analyse transactions to identify unusual patterns and discrepancies." },
  { icon: AlertTriangle, title: "Anomaly Detection", desc: "Identify duplicate charges, unexpected rates, and unusual transactions." },
  { icon: FileText, title: "Standard Statement Format", desc: "Convert provider statements into a consistent format to make them easier to understand." },
  { icon: MessageSquare, title: "Dispute Assistance", desc: "Generate clear wording to help dispute incorrect charges and communicate with providers." },
];

const Features = () => (
  <PublicLayout>
    <h1 className="text-2xl font-bold text-foreground mb-8">Features</h1>
    <div className="grid gap-4 sm:grid-cols-2">
      {features.map((f) => (
        <Card key={f.title} className="bg-card">
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <f.icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{f.title}</CardTitle>
              <CardDescription className="mt-1">{f.desc}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  </PublicLayout>
);

export default Features;
