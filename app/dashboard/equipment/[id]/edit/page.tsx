import { EquipmentForm } from "@/components/dashboard";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <EquipmentForm id={(await params).id} />;
}
