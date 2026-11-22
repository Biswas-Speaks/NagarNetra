import type { Metadata } from "next";
import { ReportWizard } from "@/components/report/ReportWizard";
import { PageTitle } from "@/components/layout/PageTitle";

export const metadata: Metadata = { title: "Report an issue" };

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageTitle k="report.title" />
      <ReportWizard />
    </div>
  );
}
