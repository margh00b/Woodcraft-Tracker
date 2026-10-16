import ServiceOrdersChargeableTable from "@/components/Invoices/ServiceOrdersChargeableTable/ServiceOrdersChargeableTable";

export const metadata = {
  title: "Chargeable Service Orders | WCKC Tracker",
  description: "Service Orders waiting to be invoiced",
};

export default function ServiceOrdersChargeablePage() {
  return <ServiceOrdersChargeableTable />;
}
