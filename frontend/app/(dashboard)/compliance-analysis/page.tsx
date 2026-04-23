import { ComplianceEntry } from "./compliance-entry"
import { type Metadata } from "next"

export const metadata: Metadata = {
  title: "Compliance Analysis — MedComply",
  description: "PDF review with AI risk feed",
}

export default function ComplianceAnalysisPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-2 pb-6 pt-2 md:px-4">
      <ComplianceEntry />
    </div>
  )
}
