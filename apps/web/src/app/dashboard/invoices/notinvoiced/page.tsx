import NotInvoicedTable from "@/components/Invoices/NotInvoicedTable/NotInvoicedTable";

export const metadata = {
  title: "Not Invoiced | WCKC Tracker",
  description: "Jobs shipped but not yet invoiced",
};

export default function NotInvoicedPage() {
  return <NotInvoicedTable />;
}
