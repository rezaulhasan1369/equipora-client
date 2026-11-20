import { RentalActivity } from "@/components/rental-workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <RentalActivity id={(await params).id} />;
}
