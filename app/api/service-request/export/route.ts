import { NextRequest, NextResponse } from 'next/server';
import {
  listServiceRequestsForExport,
} from '@/lib/db';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';
import { snakeToCamelCase, formatStackUserLight } from '@/lib/utils';
import { stackServerApp } from '@/stack';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const scopeParam = searchParams.get('scope');
    const scope = scopeParam === 'pending' || scopeParam === 'completed' ? scopeParam : undefined;

    const pageSizeParam = searchParams.get('pageSize');
    if (pageSizeParam) {
      // Ignored intentionally – export always returns all matching records
    }

    const assignedToParam = searchParams.get('assignedTo');
    const equipmentId = searchParams.get('equipmentId') || undefined;
    const priority = searchParams.get('priority') || undefined;
    let approval = searchParams.get('approval') || undefined;
    const requestType = searchParams.get('requestType') || undefined;

    const userRole = getUserRole(user);
    if (userRole === 'technician') {
      approval = 'approved';
    }

    const assignedToTechnicianId = assignedToParam === 'me' ? user.id : undefined;

    const rows = await listServiceRequestsForExport(
      scope,
      assignedToTechnicianId,
      equipmentId,
      priority,
      approval,
      requestType,
    );

    // Enrich technicians similar to /api/service-request
    const techIdSet = new Set<string>();
    for (const r of rows) {
      if (r.assigned_technician_id) techIdSet.add(r.assigned_technician_id);
      const extra = Array.isArray((r as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids)
        ? (r as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids!
        : [];
      for (const id of extra) {
        if (id) techIdSet.add(id);
      }
    }

    const techIds = Array.from(techIdSet);
    const techMap = new Map<string, unknown>();
    await Promise.all(
      techIds.map(async (id) => {
        try {
          const technician = await stackServerApp.getUser(id);
          if (technician) techMap.set(id, formatStackUserLight(technician));
        } catch {
          // ignore
        }
      }),
    );

    const data = rows.map((r) => {
      const base = snakeToCamelCase(r);
      const primaryTechnician = r.assigned_technician_id ? techMap.get(r.assigned_technician_id) ?? null : null;
      const extraIds = Array.isArray((r as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids)
        ? (r as unknown as { assigned_technician_ids?: string[] }).assigned_technician_ids!
        : [];
      const extraTechnicians: unknown[] = [];
      for (const id of extraIds) {
        const t = id ? techMap.get(id) : null;
        if (t) extraTechnicians.push(t);
      }
      const technicians: unknown[] = [];
      if (primaryTechnician) {
        technicians.push(primaryTechnician);
      }
      for (const t of extraTechnicians) {
        if (!technicians.includes(t)) {
          technicians.push(t);
        }
      }
      return {
        ...base,
        technician: primaryTechnician,
        technicians: technicians.length > 0 ? technicians : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}




