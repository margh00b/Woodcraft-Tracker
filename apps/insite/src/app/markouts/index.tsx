import React from "react";
import { FormIndexScreen } from "@/components/Common/FormIndexScreen/FormIndexScreen";

export default function MarkoutsScreen() {
  return (
    <FormIndexScreen
      title="Markouts"
      itemLabel="Markout"
      formType="markouts"
      baseRoute="/markouts"
    />
  );
}
