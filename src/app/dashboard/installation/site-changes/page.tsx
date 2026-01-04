import SiteChanges from "@/components/SiteChanges/SiteChanges";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Changes | WCKC Tracker",
};

export default function SiteChangesPage() {
  return <SiteChanges />;
}
