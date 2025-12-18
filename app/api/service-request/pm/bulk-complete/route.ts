import { NextRequest, NextResponse } from "next/server";
import { bulkCompletePendingPmForLocation, countPendingPmForLocation } from "@/lib/db";
import { ensureRole, getCurrentServerUser } from "@/lib/auth";
import { APPROVER_ROLES } from "@/lib/types/user";
import { getTodaySaudiDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    ensureRole(user, APPROVER_ROLES);

    const { searchParams } = new URL(req.url);
    const locationId = (searchParams.get("locationId") || "").trim();
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    const count = await countPendingPmForLocation(locationId);
    return NextResponse.json({ data: { count } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    // ensureRole throws; treat as Forbidden
    if (msg.toLowerCase().includes("forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    ensureRole(user, APPROVER_ROLES);

    const body = (await req.json().catch(() => null)) as { locationId?: string } | null;
    const locationId = (body?.locationId || "").trim();
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    const lastMaintenance = getTodaySaudiDate();
    const { updatedCount, equipmentUpdated } = await bulkCompletePendingPmForLocation({
      locationId,
      actorId: user.id,
      lastMaintenance,
    });

    return NextResponse.json({ data: { updatedCount, equipmentUpdated, lastMaintenance } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    if (msg.toLowerCase().includes("forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


