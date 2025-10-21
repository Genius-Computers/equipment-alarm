"use client";

import { useParams } from "next/navigation";
import EquipmentDetail from "@/components/EquipmentDetail";

export default function DetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  return <EquipmentDetail equipmentId={id} canonicalizeToTag />;
}
