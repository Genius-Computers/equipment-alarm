import { getDb } from './connection';
import { DbServiceRequest, DbEquipment } from '../types';
import { toJsonbParam } from '../utils';
import { randomUUID } from 'crypto';

export const listServiceRequestPaginated = async (
  page: number = 1,
  pageSize: number = 50,
  scope?: 'pending' | 'completed',
  assignedToTechnicianId?: string,
  equipmentId?: string,
  priority?: string,
  approval?: string,
  requestType?: string,
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
    order by sr.created_at desc nulls last
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
