export interface AppMetadata {
  appName: string;
  version: string;
  environmentLabel?: string;
  descriptionShort: string;
  features: Array<{ title: string }>;
  privacySummary: string;
  feedbackEnabled: boolean;
  supportEmail?: string;
  profilesEnabled: boolean;
}

const appMetadata: AppMetadata = {
  appName: "Statement Checker",
  version: "v0.1.0",
  environmentLabel: "Beta",
  descriptionShort:
    "Upload your Support at Home provider statements and instantly see every transaction in a calendar view, spending breakdown, and overcharge alerts.",
  features: [
    { title: "Calendar view of all transactions" },
    { title: "Spending breakdown by category" },
    { title: "Overcharge and anomaly detection" },
    { title: "Dispute report generation" },
    { title: "Share results via link" },
  ],
  privacySummary:
    "Your uploaded statements are processed securely. Data is stored in your account and is never shared with third parties. You can delete your data at any time from settings.",
  feedbackEnabled: true,
  supportEmail: undefined,
  profilesEnabled: false,
};

export default appMetadata;
