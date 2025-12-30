import { getDb } from './connection';
import { DbServiceRequest, DbEquipment } from '../types';
import { toJsonbParam } from '../utils';
import { randomUUID } from 'crypto';
import type { PmDetails } from '../types/preventive-maintenance';

export const listServiceRequestPaginated = async (
  page: number = 1,
  pageSize: number = 50,
  scope?: 'pending' | 'completed',
  assignedToTechnicianId?: string,
  equipmentId?: string,
  priority?: string,
  approval?: string,
  requestType?: string,
  excludePreventive?: boolean,
): Promise<{ rows: (DbServiceRequest & { equipment: DbEquipment | null })[]; total: number }> => {
  const sql = getDb();
  const offset = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const limit = Math.max(1, Number(pageSize));
  
  console.log('[DB listServiceRequestPaginated] Called with:', { page, pageSize, scope, assignedToTechnicianId, equipmentId, priority, approval, requestType });

  const scopeFilter = scope === 'pending'
    ? sql`(sr.approval_status = 'pending' or (sr.approval_status = 'approved' and sr.work_status = 'pending'))`
    : scope === 'completed'
    ? sql`(sr.approval_status <> 'pending' and sr.work_status <> 'pending')`
    : sql`true`;

  const techFilter = assignedToTechnicianId
    ? sql`(sr.assigned_technician_id = ${assignedToTechnicianId} or sr.assigned_technician_ids ? ${assignedToTechnicianId})`
    : sql`true`;
  const equipmentFilter = equipmentId ? sql`sr.equipment_id = ${equipmentId}` : sql`true`;
  const priorityFilter = priority && priority !== 'all' && priority !== 'overdue' ? sql`sr.priority = ${priority}` : sql`true`;
  const overdueFilter = priority === 'overdue'
    ? sql`(sr.work_status = 'pending' and (sr.scheduled_at)::timestamptz < (now() - interval '5 days'))`
    : sql`true`;
  const approvalFilter = approval && approval !== 'all' ? sql`sr.approval_status = ${approval}` : sql`true`;
  const requestTypeFilter = requestType && requestType !== 'all' ? sql`sr.request_type = ${requestType}` : sql`true`;
  const excludePreventiveFilter = excludePreventive ? sql`sr.request_type <> 'preventive_maintenance'` : sql`true`;

  const countRows = await sql`
    select count(*)::int as count
    from service_request sr
    where sr.deleted_at is null
      and ${scopeFilter}
      and ${techFilter}
      and ${equipmentFilter}
      and ${priorityFilter}
      and ${approvalFilter}
      and ${overdueFilter}
      and ${requestTypeFilter}
      and ${excludePreventiveFilter}
  `;
  const total = (countRows?.[0]?.count as number) ?? 0;

  const rows = await sql`
    select sr.*, to_jsonb(e) as equipment
    from service_request sr
    left join equipment e on e.id = sr.equipment_id and e.deleted_at is null
    where sr.deleted_at is null
      and ${scopeFilter}
      and ${techFilter}
      and ${equipmentFilter}
      and ${priorityFilter}
      and ${approvalFilter}
      and ${overdueFilter}
      and ${requestTypeFilter}
      and ${excludePreventiveFilter}
    order by sr.ticket_id desc nulls last, sr.created_at desc nulls last
    limit ${limit} offset ${offset}
  `;

  return { rows: rows as unknown as (DbServiceRequest & { equipment: DbEquipment | null })[], total };
};

export const getServiceRequestById = async (id: string): Promise<(DbServiceRequest & { equipment: DbEquipment | null }) | null> => {
  const sql = getDb();
  const rows = await sql`
    select sr.*, to_jsonb(e) as equipment
    from service_request sr
    left join equipment e on e.id = sr.equipment_id
    where sr.id = ${id}
    limit 1`;
  return (rows && rows.length > 0 ? (rows[0] as unknown as (DbServiceRequest & { equipment: DbEquipment | null })) : null);
};

export const listServiceRequestsForExport = async (
  scope?: 'pending' | 'completed',
  assignedToTechnicianId?: string,
  equipmentId?: string,
  priority?: string,
  approval?: string,
  requestType?: string,
): Promise<(DbServiceRequest & { equipment: DbEquipment | null })[]> => {
  const sql = getDb();

  const scopeFilter = scope === 'pending'
    ? sql`(sr.approval_status = 'pending' or (sr.approval_status = 'approved' and sr.work_status = 'pending'))`
    : scope === 'completed'
    ? sql`(sr.approval_status <> 'pending' and sr.work_status <> 'pending')`
    : sql`true`;

  const techFilter = assignedToTechnicianId
    ? sql`(sr.assigned_technician_id = ${assignedToTechnicianId} or sr.assigned_technician_ids ? ${assignedToTechnicianId})`
    : sql`true`;
  const equipmentFilter = equipmentId ? sql`sr.equipment_id = ${equipmentId}` : sql`true`;
  const priorityFilter = priority && priority !== 'all' && priority !== 'overdue' ? sql`sr.priority = ${priority}` : sql`true`;
  const overdueFilter = priority === 'overdue'
    ? sql`(sr.work_status = 'pending' and (sr.scheduled_at)::timestamptz < (now() - interval '5 days'))`
    : sql`true`;
  const approvalFilter = approval && approval !== 'all' ? sql`sr.approval_status = ${approval}` : sql`true`;
  const requestTypeFilter = requestType && requestType !== 'all' ? sql`sr.request_type = ${requestType}` : sql`true`;

  const rows = await sql`
    select 
      sr.*, 
      to_jsonb(
        jsonb_build_object(
          'id', e.id,
          'name', e.name,
          'part_number', e.part_number,
          'model', e.model,
          'manufacturer', e.manufacturer,
          'serial_number', e.serial_number,
          'location', e.location,
          'sub_location', e.sub_location,
          'location_id', e.location_id,
          'location_name', l.name,
          'campus', l.campus,
          'status', e.status,
          'last_maintenance', e.last_maintenance,
          'maintenance_interval', e.maintenance_interval,
          'created_at', e.created_at,
          'updated_at', e.updated_at,
          'deleted_at', e.deleted_at,
          'created_by', e.created_by,
          'updated_by', e.updated_by,
          'deleted_by', e.deleted_by
        )
      ) as equipment
    from service_request sr
    left join equipment e on e.id = sr.equipment_id and e.deleted_at is null
    left join locations l on e.location_id = l.id and l.deleted_at is null
    where sr.deleted_at is null
      and ${scopeFilter}
      and ${techFilter}
      and ${equipmentFilter}
      and ${priorityFilter}
      and ${approvalFilter}
      and ${overdueFilter}
      and ${requestTypeFilter}
    order by sr.ticket_id asc nulls last, sr.created_at asc
  `;

  return rows as unknown as (DbServiceRequest & { equipment: DbEquipment | null })[];
};

// Compute next yearly sequential ticket id in format YY-XXXX (e.g., 25-0001, 25-0002)
// Uses advisory lock to prevent race conditions when generating ticket numbers
export const getNextTicketId = async (at: Date = new Date()): Promise<string> => {
  try {
    const sql = getDb();
    const yy = String(at.getFullYear()).slice(-2); // Last 2 digits of year
    const yearPrefix = yy;

    // Use PostgreSQL advisory lock to ensure only one ticket is generated at a time
    // Lock ID: hash of year prefix (e.g., "25" -> 25)
    const lockId = parseInt(yearPrefix, 10);

    await sql`select pg_advisory_lock(${lockId})`;

    try {
      // Select max numeric suffix for tickets that match this year's prefix
    const rows = await sql`
      select coalesce(max(
        case 
          when ticket_id is not null and ticket_id like ${yearPrefix + '-%'}
          then (split_part(ticket_id, '-', 2))::int
          else 0
        end
      ), 0) as max_suffix
      from service_request
    ` as unknown as Array<{ max_suffix: number }>; 

    const maxSuffix = (rows?.[0]?.max_suffix ?? 0) as number;
    const next = String((Number.isFinite(maxSuffix) ? maxSuffix : 0) + 1).padStart(4, '0');
      
    return `${yearPrefix}-${next}`;
    } finally {
      // Always release the lock
      await sql`select pg_advisory_unlock(${lockId})`;
    }
  } catch (error) {
    console.error('Error in getNextTicketId:', error);
    // Fallback: return a timestamped ticket ID if database query fails
    const yy = String(at.getFullYear()).slice(-2);
    const timestamp = Date.now().toString().slice(-4);
    return `${yy}-${timestamp}`;
  }
};

export const insertServiceRequest = async (
  input: Omit<DbServiceRequest, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  const explicitId = randomUUID();
  const createdAt = new Date();
  const ticketId = await getNextTicketId(createdAt);
  const [row] = await sql`
    insert into service_request (
      id, created_at, created_by,
      equipment_id, assigned_technician_id, assigned_technician_ids, request_type, scheduled_at,
      priority, approval_status, work_status,
      problem_description, technical_assessment, recommendation,
      spare_parts_needed, ticket_id, pm_details
    ) values (
      ${explicitId}, ${createdAt}, ${actorId},
      ${input.equipment_id}, ${input.assigned_technician_id}, ${toJsonbParam(input.assigned_technician_ids)}::jsonb, ${input.request_type}, ${input.scheduled_at},
      ${input.priority}, ${input.approval_status}, ${input.work_status},
      ${input.problem_description}, ${input.technical_assessment}, ${input.recommendation},
      ${toJsonbParam(input.spare_parts_needed)}::jsonb, ${ticketId}, ${toJsonbParam(input.pm_details)}::jsonb
    ) returning *`;
  return row;
};

// Bulk-insert preventive maintenance service requests for many equipments in one go.
// Uses the same yearly ticket id pattern and advisory lock strategy as getNextTicketId,
// but generates a contiguous range of ticket ids for the batch in a single SQL statement.
export const bulkInsertPmServiceRequests = async (
  inputs: Array<{ equipmentId: string; equipmentName: string }>,
  actorId: string,
): Promise<Array<{ id: string }>> => {
  if (!inputs || inputs.length === 0) return [];

  const sql = getDb();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2); // Last 2 digits of year
  const yearPrefix = yy;
  const lockId = parseInt(yearPrefix, 10);

  const equipmentIds = inputs.map((i) => i.equipmentId);
  const equipmentNames = inputs.map((i) => i.equipmentName);
  const count = inputs.length;

  await sql`select pg_advisory_lock(${lockId})`;

  try {
    // Find current max numeric suffix for this year's ticket ids
    const rows = await sql`
      select coalesce(max(
        case 
          when ticket_id is not null and ticket_id like ${yearPrefix + '-%'}
          then (split_part(ticket_id, '-', 2))::int
          else 0
        end
      ), 0) as max_suffix
      from service_request
    ` as unknown as Array<{ max_suffix: number }>;

    const maxSuffix = (rows?.[0]?.max_suffix ?? 0) as number;
    const base = Number.isFinite(maxSuffix) ? maxSuffix : 0;

    // Insert all PM service requests in one statement, assigning ticket ids
    // sequentially starting from base + 1.
    const inserted = await sql`
      with numbered as (
        select
          unnest(${equipmentIds}::uuid[]) as equipment_id,
          unnest(${equipmentNames}::text[]) as equipment_name,
          generate_series(1, ${count}::int) as seq
      )
      insert into service_request (
        id, created_at, created_by,
        equipment_id, assigned_technician_id, assigned_technician_ids, request_type, scheduled_at,
        priority, approval_status, work_status,
        problem_description, technical_assessment, recommendation,
        spare_parts_needed, ticket_id, pm_details
      )
      select
        gen_random_uuid(), now(), ${actorId},
        n.equipment_id, null, '[]'::jsonb, 'preventive_maintenance', now(),
        'medium', 'approved', 'pending',
        'Preventive maintenance for ' || n.equipment_name,
        null, null,
        '[]'::jsonb,
        ${yearPrefix} || '-' || lpad((${base} + n.seq)::text, 4, '0'),
        null
      from numbered n
      returning id
    ` as unknown as Array<{ id: string }>;

    return inserted;
  } finally {
    await sql`select pg_advisory_unlock(${lockId})`;
  }
};

export const updateServiceRequest = async (
  id: string,
  input: Omit<DbServiceRequest, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  const [row] = await sql`
    with updated as (
      update service_request set
        updated_by = ${actorId},
        updated_at = now(),

        equipment_id = ${input.equipment_id},
        assigned_technician_id = ${input.assigned_technician_id},
        assigned_technician_ids = ${toJsonbParam(input.assigned_technician_ids)}::jsonb,
        request_type = ${input.request_type},
        scheduled_at = ${input.scheduled_at},
        priority = ${input.priority},
        approval_status = ${input.approval_status},
        work_status = ${input.work_status},
        problem_description = ${input.problem_description},
        technical_assessment = ${input.technical_assessment},
        recommendation = ${input.recommendation},
        spare_parts_needed = ${toJsonbParam(input.spare_parts_needed)}::jsonb,
        approval_note = ${input.approval_note},
        pm_details = ${toJsonbParam(input.pm_details)}::jsonb
      where id = ${id}
      returning *
    )
    select u.*, to_jsonb(e) as equipment
    from updated u
    left join equipment e on e.id = u.equipment_id`;
  return row as unknown as (DbServiceRequest & { equipment: DbEquipment | null });
};

export const bulkUpdatePmDetailsByEquipmentNameKey = async (input: {
  /** Raw equipment name taken from the source ticket's equipment row. */
  equipmentNameRaw: string;
  pmDetails: PmDetails;
  actorId: string;
}): Promise<number> => {
  const sql = getDb();
  const equipmentNameRaw = (input.equipmentNameRaw || '');
  if (!equipmentNameRaw || equipmentNameRaw.trim().length === 0) return 0;

  const rows = await sql`
    update service_request sr
    set
      updated_by = ${input.actorId},
      updated_at = now(),
      pm_details = ${toJsonbParam(input.pmDetails)}::jsonb
    from equipment e
    where sr.equipment_id = e.id
      and sr.deleted_at is null
      and e.deleted_at is null
      and sr.request_type = 'preventive_maintenance'
      and sr.work_status = 'pending'
      and lower(regexp_replace(trim(replace(e.name, chr(160), ' ')), E'\\s+', ' ', 'g'))
        = lower(regexp_replace(trim(replace(${equipmentNameRaw}, chr(160), ' ')), E'\\s+', ' ', 'g'))
    returning sr.id
  `;

  return Array.isArray(rows) ? rows.length : 0;
};

export const countPendingPmByEquipmentNameKey = async (input: {
  equipmentNameRaw: string;
}): Promise<number> => {
  const sql = getDb();
  const equipmentNameRaw = (input.equipmentNameRaw || '');
  if (!equipmentNameRaw || equipmentNameRaw.trim().length === 0) return 0;

  const rows = await sql`
    select count(*)::int as count
    from service_request sr
    join equipment e on e.id = sr.equipment_id
    where sr.deleted_at is null
      and e.deleted_at is null
      and sr.request_type = 'preventive_maintenance'
      and sr.work_status = 'pending'
      and lower(regexp_replace(trim(replace(e.name, chr(160), ' ')), E'\\s+', ' ', 'g'))
        = lower(regexp_replace(trim(replace(${equipmentNameRaw}, chr(160), ' ')), E'\\s+', ' ', 'g'))
  ` as unknown as Array<{ count: number }>;

  return Number(rows?.[0]?.count ?? 0);
};

export const countPendingPmForLocation = async (locationId: string): Promise<number> => {
  const sql = getDb();
  if (!locationId || String(locationId).trim().length === 0) return 0;
  const rows = await sql`
    select count(*)::int as count
    from service_request sr
    join equipment e on e.id = sr.equipment_id
    where sr.deleted_at is null
      and e.deleted_at is null
      and sr.request_type = 'preventive_maintenance'
      and sr.work_status = 'pending'
      and e.location_id = ${locationId}
  ` as unknown as Array<{ count: number }>;
  return Number(rows?.[0]?.count ?? 0);
};

export const bulkCompletePendingPmForLocation = async (input: {
  locationId: string;
  actorId: string;
  lastMaintenance: string;
}): Promise<{ updatedCount: number; equipmentUpdated: number }> => {
  const sql = getDb();
  if (!input.locationId || input.locationId.trim().length === 0) {
    return { updatedCount: 0, equipmentUpdated: 0 };
  }

  const rows = await sql`
    with updated as (
      update service_request sr
      set
        updated_by = ${input.actorId},
        updated_at = now(),
        work_status = 'completed'
      from equipment e
      where sr.equipment_id = e.id
        and sr.deleted_at is null
        and e.deleted_at is null
        and sr.request_type = 'preventive_maintenance'
        and sr.work_status = 'pending'
        and e.location_id = ${input.locationId}
      returning sr.equipment_id
    ),
    equipment_updated as (
      update equipment e
      set
        updated_by = ${input.actorId},
        updated_at = now(),
        last_maintenance = ${input.lastMaintenance}
      where e.deleted_at is null
        and e.id in (select distinct equipment_id from updated)
      returning e.id
    )
    select
      (select count(*)::int from updated) as updated_count,
      (select count(*)::int from equipment_updated) as equipment_updated
  ` as unknown as Array<{ updated_count: number; equipment_updated: number }>;

  const row = rows?.[0];
  return {
    updatedCount: Number(row?.updated_count ?? 0),
    equipmentUpdated: Number(row?.equipment_updated ?? 0),
  };
};

export const getServiceRequestsBySparePartId = async (
  sparePartId: string
): Promise<(DbServiceRequest & { equipment: DbEquipment | null })[]> => {
  const sql = getDb();
  
  // Use PostgreSQL JSONB operators to search for sparePartId in the array
  const rows = await sql`
    select sr.*, to_jsonb(e) as equipment
    from service_request sr
    left join equipment e on e.id = sr.equipment_id
    where sr.spare_parts_needed is not null
      and jsonb_array_length(sr.spare_parts_needed) > 0
      and exists (
        select 1
        from jsonb_array_elements(sr.spare_parts_needed) as part
        where part->>'sparePartId' = ${sparePartId}
      )
    order by sr.created_at desc
  `;
  
  return rows as unknown as (DbServiceRequest & { equipment: DbEquipment | null })[];
};

export const getServiceRequestStats = async (
  scope?: 'pending' | 'completed',
  userId?: string,
  isTechnician?: boolean,
) => {
  const sql = getDb();

  const scopeFilter = scope === 'pending'
    ? sql`(sr.approval_status = 'pending' or (sr.approval_status = 'approved' and sr.work_status = 'pending'))`
    : scope === 'completed'
    ? sql`(sr.approval_status <> 'pending' and sr.work_status <> 'pending')`
    : sql`true`;

  // Technicians only ever see approved requests in the UI; mirror that constraint here.
  const roleApprovalFilter = isTechnician ? sql`sr.approval_status = 'approved'` : sql`true`;

  const rows = await sql`
    select
      count(*)::int as total,
      count(*) filter (where sr.request_type = 'preventive_maintenance')::int as preventive_maintenance,
      count(*) filter (where sr.request_type = 'corrective_maintenence')::int as corrective_maintenence,
      count(*) filter (where sr.request_type = 'install')::int as install,
      count(*) filter (where sr.request_type = 'assess')::int as assess,
      count(*) filter (where sr.request_type = 'other')::int as other,
      ${
        userId
          ? sql`count(*) filter (
              where
                (sr.assigned_technician_id = ${userId})
                or (sr.assigned_technician_ids ? ${userId})
            )::int`
          : sql`0::int`
      } as assigned_to_me
    from service_request sr
    where sr.deleted_at is null
      and ${scopeFilter}
      and ${roleApprovalFilter}
  ` as unknown as Array<{
    total: number;
    preventive_maintenance: number;
    corrective_maintenence: number;
    install: number;
    assess: number;
    other: number;
    assigned_to_me: number;
  }>;

  const row = rows[0] ?? {
    total: 0,
    preventive_maintenance: 0,
    corrective_maintenence: 0,
    install: 0,
    assess: 0,
    other: 0,
    assigned_to_me: 0,
  };

  return {
    total: row.total,
    preventiveMaintenance: row.preventive_maintenance,
    correctiveMaintenance: row.corrective_maintenence,
    install: row.install,
    assess: row.assess,
    other: row.other,
    assignedToMe: row.assigned_to_me,
  };
};

