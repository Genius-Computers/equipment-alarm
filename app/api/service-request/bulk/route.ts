import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';
import {
  getDb,
  insertServiceRequest,
  updateEquipmentStatus,
  createJobOrderForCsvImport,
} from '@/lib/db';
import {
  ServiceRequestApprovalStatus,
  ServiceRequestPriority,
  ServiceRequestType,
  ServiceRequestWorkStatus,
} from '@/lib/types';
import { camelToSnakeCase, formatStackUserLight } from '@/lib/utils';
import { stackServerApp } from '@/stack';

type ImportItem = {
  ticketNo?: string;
  tagNumber?: string;
  requestType?: string;
  priority?: string;
  schedule?: string;
  technician?: string;
  status?: string;
  operationalStatus?: string;
};

const normalize = (value: unknown): string => (value ?? '').toString().trim();

const isValidSchedule = (value: string): boolean => {
  const s = normalize(value);
  if (!s) return false;
  // Allow plain date (YYYY-MM-DD) or any ISO-parsable date/time.
  // Date.parse is lenient but good enough here; the goal is to reject obviously invalid values.
  const timestamp = Date.parse(s);
  return Number.isFinite(timestamp);
};

const mapRequestType = (value: unknown): ServiceRequestType | null => {
  const s = normalize(value).toLowerCase();
  if (!s) return null;
  const normalized = s.replace(/\s+/g, '_');
  switch (normalized) {
    case 'preventive_maintenance':
      return ServiceRequestType.PREVENTIVE_MAINTENANCE;
    case 'corrective_maintenance':
    case 'corrective_maintenence':
      return ServiceRequestType.CORRECTIVE_MAINTENANCE;
    case 'install':
      return ServiceRequestType.INSTALL;
    case 'assess':
      return ServiceRequestType.ASSESS;
    case 'other':
      return ServiceRequestType.OTHER;
    default:
      return null;
  }
};

const mapPriority = (value: unknown): ServiceRequestPriority | null => {
  const s = normalize(value).toLowerCase();
  if (!s) return null;
  switch (s) {
    case 'low':
      return ServiceRequestPriority.LOW;
    case 'medium':
      return ServiceRequestPriority.MEDIUM;
    case 'high':
      return ServiceRequestPriority.HIGH;
    default:
      return null;
  }
};

const mapOperationalStatusToEquipmentStatus = (value: unknown): string | null => {
  const s = normalize(value).toLowerCase();
  // Default to Operational when empty / not provided
  if (!s) return 'Operational';
  if (s === 'operational' || s === 'working') {
    return 'Operational';
  }
  if (s.includes('under repair')) {
    return 'Under Repair, Waiting for Spare Parts';
  }
  return null;
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = getUserRole(user);
    if (role !== 'admin' && role !== 'admin_x' && role !== 'supervisor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const items: ImportItem[] = Array.isArray(body?.items) ? body.items : [];
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // 1) Validate Ticket No column is empty everywhere
    const rowsWithTicketNo: number[] = [];
    items.forEach((item, index) => {
      const ticketNo = normalize(item.ticketNo);
      if (ticketNo.length > 0) {
        rowsWithTicketNo.push(index + 1);
      }
    });

    if (rowsWithTicketNo.length > 0) {
      return NextResponse.json(
        {
          error:
            'CSV import rejected: Ticket No must be blank for all rows. ' +
            `Found non-empty values in row(s): ${rowsWithTicketNo.join(', ')}.`,
          rowsWithTicketNo,
        },
        { status: 400 },
      );
    }

    // 2) Normalize & validate required fields per row
    const normalizedItems: Array<
      Required<Pick<ImportItem, 'tagNumber' | 'requestType' | 'priority' | 'schedule'>> &
        Pick<ImportItem, 'technician' | 'status' | 'operationalStatus'>
    > = [];
    const missingRequired: string[] = [];

    items.forEach((raw, index) => {
      const rowIndex = index + 1;
      const tagNumber = normalize(raw.tagNumber);
      const requestTypeRaw = raw.requestType;
      const priorityRaw = raw.priority;
      const schedule = normalize(raw.schedule);

      const rt = mapRequestType(requestTypeRaw);
      const pr = mapPriority(priorityRaw);

      const missing: string[] = [];
      if (!tagNumber) missing.push('Tag Number');
      if (!rt) missing.push('Request Type');
      if (!schedule) {
        missing.push('Schedule');
      } else if (!isValidSchedule(schedule)) {
        missing.push('Schedule (invalid date/time)');
      }

      if (missing.length > 0) {
        missingRequired.push(`Row ${rowIndex}: ${missing.join(', ')}`);
      }

      normalizedItems.push({
        tagNumber,
        requestType: rt ?? ServiceRequestType.PREVENTIVE_MAINTENANCE,
        priority: pr ?? ServiceRequestPriority.MEDIUM,
        schedule,
        technician: normalize(raw.technician),
        status: normalize(raw.status),
        operationalStatus: normalize(raw.operationalStatus),
      });
    });

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error:
            'CSV import rejected: Missing or invalid required fields.\n' +
            missingRequired.join('\n'),
        },
        { status: 400 },
      );
    }

    const sql = getDb();

    // 3) Resolve equipment by tag number in bulk
    const tagNumbers = Array.from(
      new Set(normalizedItems.map((i) => i.tagNumber.toLowerCase()).filter((v) => v.length > 0)),
    );

    const equipmentRows =
      tagNumbers.length > 0
        ? await sql`
      select id, name, part_number
      from equipment
      where deleted_at is null
        and lower(trim(part_number)) = any(${tagNumbers}::text[])
    ` as Array<{ id: string; name: string; part_number: string }>
        : [];

    const equipmentByTag = new Map<string, { id: string; name: string; part_number: string }>();
    for (const row of equipmentRows) {
      equipmentByTag.set(row.part_number.toLowerCase().trim(), row);
    }

    const missingTags = new Set<string>();
    normalizedItems.forEach((item) => {
      const key = item.tagNumber.toLowerCase();
      if (!equipmentByTag.has(key)) {
        missingTags.add(item.tagNumber);
      }
    });

    if (missingTags.size > 0) {
      return NextResponse.json(
        {
          error:
            'CSV import rejected: Some Tag Numbers do not match any equipment records. ' +
            'Please verify Tag Numbers and try again.\n' +
            Array.from(missingTags)
              .sort((a, b) => a.localeCompare(b))
              .map((t) => `• ${t}`)
              .join('\n'),
          missingTagNumbers: Array.from(missingTags),
        },
        { status: 400 },
      );
    }

    // 4) Resolve technicians by display name (optional column)
    const technicianNames = Array.from(
      new Set(
        normalizedItems
          .map((i) => normalize(i.technician))
          .filter((name) => name.length > 0),
      ),
    );

    const technicianMap = new Map<string, string>(); // displayName -> userId
    const unresolvedTechnicians = new Set<string>();

    if (technicianNames.length > 0) {
      const allUsers = await stackServerApp.listUsers({ limit: 1000 });
      const formatted = allUsers.map((u) => formatStackUserLight(u)).filter(Boolean) as Array<{
        id: string;
        displayName?: string | null;
      }>;

      for (const tech of formatted) {
        const label = normalize(tech.displayName);
        if (label) {
          technicianMap.set(label, tech.id);
        }
      }

      for (const name of technicianNames) {
        if (!technicianMap.has(name)) {
          unresolvedTechnicians.add(name);
        }
      }
    }

    // 5) Create service requests
    const created: Array<{
      id: string;
      ticketId: string;
      equipmentId: string;
      equipmentName: string;
      tagNumber: string;
    }> = [];

    const equipmentStatusUpdates = new Map<string, string>(); // equipmentId -> status

    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      const equipmentKey = item.tagNumber.toLowerCase();
      const equipment = equipmentByTag.get(equipmentKey)!;

      const technicianName = normalize(item.technician);
      const technicianId = technicianName ? technicianMap.get(technicianName) ?? null : null;

      const scheduleIso = item.schedule;

      const body = {
        equipmentId: equipment.id,
        assignedTechnicianId: technicianId ?? undefined,
        requestType: item.requestType,
        scheduledAt: scheduleIso,
        priority: item.priority,
        approvalStatus: ServiceRequestApprovalStatus.PENDING,
        workStatus: ServiceRequestWorkStatus.PENDING,
      };

      const snake = camelToSnakeCase(body) as Omit<
        import('@/lib/types/service-request').DbServiceRequest,
        'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'
      >;

      // eslint-disable-next-line no-await-in-loop
      const row = await insertServiceRequest(snake, user.id);

      created.push({
        id: (row as { id: string }).id,
        ticketId: (row as { ticket_id?: string }).ticket_id ?? '',
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        tagNumber: equipment.part_number,
      });

      const nextStatus = mapOperationalStatusToEquipmentStatus(item.operationalStatus);
      if (nextStatus) {
        equipmentStatusUpdates.set(equipment.id, nextStatus);
      }
    }

    // 6) Apply equipment operational status updates (if any)
    for (const [equipmentId, status] of equipmentStatusUpdates.entries()) {
      // eslint-disable-next-line no-await-in-loop
      await updateEquipmentStatus(equipmentId, status, user.id);
    }

    // 7) Create a single job order for this upload (using first ticket number)
    let jobOrder = null;
    if (created.length > 0) {
      jobOrder = await createJobOrderForCsvImport(
        user.id,
        created.map((c) => ({
          serviceRequestId: c.id,
          ticketId: c.ticketId,
          equipmentId: c.equipmentId,
          equipmentName: c.equipmentName,
          tagNumber: c.tagNumber,
        })),
      );
    }

    return NextResponse.json({
      success: true,
      createdCount: created.length,
      jobOrder: jobOrder
        ? {
            id: (jobOrder as { id: string }).id,
            orderNumber: (jobOrder as { order_number: string }).order_number,
          }
        : null,
      unresolvedTechnicians: Array.from(unresolvedTechnicians),
      ticketIds: created.map((c) => c.ticketId),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}




