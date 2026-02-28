import PublicLayout from "@/components/PublicLayout";

const Beta = () => (
  <PublicLayout>
    <h1 className="text-2xl font-bold text-foreground mb-6">Statement Checker Beta Program</h1>
    <div className="space-y-4 text-base text-muted-foreground leading-relaxed max-w-[800px]">
      <p>
        Statement Checker is currently in beta. The goal of the beta program is to test the app using real statements from different providers and a wide variety of layouts and formats.
      </p>
      <p>
        Because every provider presents statements differently, this testing helps improve how accurately the app can extract transactions, standardise the information, and identify potential discrepancies.
      </p>
      <p>
        We welcome feedback on how the app works and feels to use, as well as the analysis itself — including flagged anomalies, transaction discrepancies, and suggested dispute wording.
      </p>
      <p>
        Your feedback helps improve accuracy and ensures the results participants see are reliable and useful.
      </p>
    </div>
  </PublicLayout>
);

export default Beta;
