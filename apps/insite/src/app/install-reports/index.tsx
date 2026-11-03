import React from "react";
import { FormIndexScreen } from "@/components/Common/FormIndexScreen/FormIndexScreen";

export default function InstallReportScreen() {
  return (
    <FormIndexScreen
      title="Installation Reports"
      itemLabel="Report"
      formType="install_reports"
      baseRoute="/install-reports"
    />
  );
}
