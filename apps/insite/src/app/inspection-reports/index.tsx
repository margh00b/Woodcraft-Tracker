import React from "react";
import { FormIndexScreen } from "@/components/Common/FormIndexScreen/FormIndexScreen";

export default function InspectionReportsScreen() {
  return (
    <FormIndexScreen
      title="Inspection Reports"
      itemLabel="Inspection Report"
      formType="inspection_reports"
      baseRoute="/inspection-reports"
      newButtonLabel="+ New Inspection"
    />
  );
}
