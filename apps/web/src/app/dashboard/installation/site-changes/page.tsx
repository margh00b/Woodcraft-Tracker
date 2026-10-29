import SiteChanges from "@/components/SiteChanges/SiteChanges";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Changes | WCKC CORE",
};

export default function SiteChangesPage() {
  return <SiteChanges />;
}
