import NewServiceOrder from "@/components/serviceOrders/newServiceOrder/newServiceOrder";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewServiceOrderPage({ params }: PageProps) {
  const { id } = await params;
  return <NewServiceOrder preselectedJobId={id} />;
}
