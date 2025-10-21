import EquipmentDetail from "@/components/EquipmentDetail";
import { getEquipmentIdByPartNumber } from "@/lib/db";

export default async function ResolveEquipmentByTagPage({ params }: { params: { partNumber: string } }) {
  const { partNumber } = params;
  const id = await getEquipmentIdByPartNumber(partNumber);
  if (!id) {
    // If tag not found, render nothing to avoid redirect loops
    return null;
  }
  return <EquipmentDetail equipmentId={id} />;
}


