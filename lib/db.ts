import { neon } from '@neondatabase/serverless';
import { DbEquipment, DbServiceRequest, DbSparePart } from './types';
import { toJsonbParam } from './utils';
import { randomUUID } from 'crypto';

// Simple Neon client factory. Uses DATABASE_URL from env.
export const getDb = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to your environment.');
  }
  return neon(connectionString);
};

// Guard to ensure schema only runs once per boot
// Use a timestamp-based check to avoid running schema checks too frequently
let schemaInitialized = false;
let lastSchemaCheck = 0;
const SCHEMA_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Ensure the equipment table exists (id as UUID, dates as text for now to match UI strings)
export const ensureSchema = async () => {
  const now = Date.now();
  
  // Skip if we've checked recently (within 5 minutes)
  if (schemaInitialized && (now - lastSchemaCheck) < SCHEMA_CHECK_INTERVAL) {
    return;
  }
  
  const sql = getDb();
  lastSchemaCheck = now;
  await sql`create extension if not exists pgcrypto`;
  await sql`
    create table if not exists equipment (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp not null default now(),
      updated_at timestamp,
      deleted_at timestamp,
      created_by text not null,
      updated_by text,
      deleted_by text,

      name text not null,
      part_number text,
      location text,
      sub_location text,
      last_maintenance text,
      maintenance_interval text,
      in_use boolean not null default true,
      model text,
      manufacturer text,
      serial_number text,
      status text not null default 'Working'
    )`;
  await sql`
    create table if not exists service_request (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp not null default now(),
      updated_at timestamp,
      deleted_at timestamp,
      created_by text not null,
      updated_by text,
      deleted_by text,

      equipment_id uuid not null,
      assigned_technician_id uuid not null,
      request_type text not null,
      scheduled_at timestamp not null,
      priority text not null,
      approval_status text not null,
      work_status text not null,
      problem_description text,
      technical_assessment text,
      recommendation text,
      spare_parts_needed jsonb,
      ticket_id text not null
    )`;
  // Add new columns to the equipment table if they do not exist
  await sql`
    alter table equipment
      add column if not exists model text,
      add column if not exists manufacturer text,
      add column if not exists serial_number text,
      add column if not exists status text not null default 'Working',
      add column if not exists sub_location text`;

  await sql`
    alter table service_request
      add column if not exists ticket_id text,
      add column if not exists approval_note text
  `;

  await sql`
    create table if not exists spare_parts (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp not null default now(),
      updated_at timestamp,
      deleted_at timestamp,
      created_by text not null,
      updated_by text,
      deleted_by text,

      name text not null,
      serial_number text,
      quantity int not null default 0,
      manufacturer text,
      supplier text
    )`;

  await sql`
    create table if not exists attendance (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      date date not null,
      log_in_time timestamp not null,
      log_out_time timestamp,
      employee_id text,
      display_name text,
      created_at timestamp not null default now(),
      updated_at timestamp,
      unique(user_id, date)
    )`;
  
  await sql`
    alter table spare_parts
      add column if not exists supplier text
  `;
  
  schemaInitialized = true;
};

export const listEquipmentCache = async () => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select id, name, part_number, location, sub_location, model, manufacturer, serial_number, status
    from equipment
    where deleted_at is null;
  `;

  return { rows: rows as Pick<DbEquipment, 'id' | 'name' | 'part_number' | 'location' | 'sub_location' | 'model' | 'manufacturer' | 'serial_number' | 'status'>[] };
}

export const listEquipmentPaginated = async (
  page: number = 1,
  pageSize: number = 4,
  q?: string
): Promise<{ rows: (DbEquipment & { latest_pending_service_request: DbServiceRequest | null })[]; total: number }> => {
  const sql = getDb();
  await ensureSchema();
  const offset = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const limit = Math.max(1, Number(pageSize));

  const textFilter = q && q.trim().length > 0
    ? sql`(
        e.name ilike ${'%' + q + '%'} or
        e.part_number ilike ${'%' + q + '%'} or
        e.location ilike ${'%' + q + '%'} or
        e.sub_location ilike ${'%' + q + '%'} or
        e.model ilike ${'%' + q + '%'} or
        e.manufacturer ilike ${'%' + q + '%'} or
        e.serial_number ilike ${'%' + q + '%'}
      )`
    : sql`true`;

  const countRows = await sql`
    select count(*)::int as count
    from equipment e
    where e.deleted_at is null
      and ${textFilter}
  `;
  const total = (countRows?.[0]?.count as number) ?? 0;

  const rows = await sql`
    select
      e.*,
      to_jsonb(s) as latest_pending_service_request
    from equipment e
    left join lateral (
      select *
      from service_request s
      where s.equipment_id = e.id
        and (s.approval_status = 'pending' or s.work_status = 'pending')
      order by s.scheduled_at desc
      limit 1
    ) s on true
    where e.deleted_at is null
      and ${textFilter}
    order by e.name asc
    limit ${limit} offset ${offset}
  `;

  return { rows: rows as unknown as (DbEquipment & { latest_pending_service_request: DbServiceRequest | null })[], total };
};

export const insertEquipment = async (
  input: Omit<DbEquipment, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    insert into equipment (
      created_at, created_by,
      name, part_number, location, sub_location,
      last_maintenance, maintenance_interval, in_use,
      model, manufacturer, serial_number, status
    ) values (
      now(), ${actorId},
      ${input.name}, ${input.part_number}, ${input.location}, ${input.sub_location},
      ${input.last_maintenance}, ${input.maintenance_interval}, ${input.in_use ?? true},
      ${input.model}, ${input.manufacturer}, ${input.serial_number}, ${input.status}
    ) returning *`;
  return row;
};

export const updateEquipment = async (
  id: string,
  input: Omit<DbEquipment, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    update equipment set
      updated_by = ${actorId},
      updated_at = now(),

      name = ${input.name},
      part_number = ${input.part_number},
      location = ${input.location},
      sub_location = ${input.sub_location},
      last_maintenance = ${input.last_maintenance},
      maintenance_interval = ${input.maintenance_interval},
      in_use = ${input.in_use ?? true},
      model = ${input.model},
      manufacturer = ${input.manufacturer},
      serial_number = ${input.serial_number},
      status = ${input.status}
    where id = ${id}
    returning *`;
  return row as unknown as DbEquipment;
};

export const softDeleteEquipment = async (
  id: string,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    update equipment set
      deleted_by = ${actorId},
      deleted_at = now()
    where id = ${id} and deleted_at is null
    returning *`;
  return row as unknown as DbEquipment | undefined;
};

export const bulkInsertEquipment = async (
  inputs: Array<Omit<DbEquipment, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>>,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  if (!inputs || inputs.length === 0) return [];
  const names = inputs.map((i) => i.name ?? null);
  const partNumbers = inputs.map((i) => i.part_number ?? null);
  const locations = inputs.map((i) => i.location ?? null);
  const subLocations = inputs.map((i) => i.sub_location ?? null);
  const lastMaintenance = inputs.map((i) => i.last_maintenance ?? null);
  const maintenanceIntervals = inputs.map((i) => i.maintenance_interval ?? null);
  const inUse = inputs.map((i) => (i.in_use ?? true));
  const models = inputs.map((i) => i.model ?? null);
  const manufacturers = inputs.map((i) => i.manufacturer ?? null);
  const serialNumbers = inputs.map((i) => i.serial_number ?? null);
  const statuses = inputs.map((i) => i.status ?? 'Working');

  const rows = await sql`
    insert into equipment (
      created_at, created_by,
      name, part_number, location, sub_location,
      last_maintenance, maintenance_interval, in_use,
      model, manufacturer, serial_number, status
    )
    select
      now(), ${actorId},
      t.name, t.part_number, t.location, t.sub_location,
      t.last_maintenance, t.maintenance_interval, t.in_use,
      t.model, t.manufacturer, t.serial_number, t.status
    from unnest(
      ${names}::text[],
      ${partNumbers}::text[],
      ${locations}::text[],
      ${subLocations}::text[],
      ${lastMaintenance}::text[],
      ${maintenanceIntervals}::text[],
      ${inUse}::boolean[],
      ${models}::text[],
      ${manufacturers}::text[],
      ${serialNumbers}::text[],
      ${statuses}::text[]
    ) as t(
      name, part_number, location, sub_location,
      last_maintenance, maintenance_interval, in_use,
      model, manufacturer, serial_number, status
    )
    returning *`;
  return rows as unknown as DbEquipment[];
};

export const getEquipmentById = async (id: string): Promise<DbEquipment | null> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select * from equipment e
    where e.id = ${id} and e.deleted_at is null
    limit 1
  `;
  return (rows && rows.length > 0 ? (rows[0] as unknown as DbEquipment) : null);
}

export const listServiceRequestPaginated = async (
  page: number = 1,
  pageSize: number = 50,
  scope?: 'pending' | 'completed',
  assignedToTechnicianId?: string,
  equipmentId?: string,
  priority?: string,
  approval?: string,
): Promise<{ rows: (DbServiceRequest & { equipment: DbEquipment | null })[]; total: number }> => {
  const sql = getDb();
  await ensureSchema();
  const offset = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const limit = Math.max(1, Number(pageSize));

  const scopeFilter = scope === 'pending'
    ? sql`(sr.approval_status = 'pending' or (sr.approval_status = 'approved' and sr.work_status = 'pending'))`
    : scope === 'completed'
    ? sql`(sr.approval_status <> 'pending' and sr.work_status <> 'pending')`
    : sql`true`;

  const techFilter = assignedToTechnicianId ? sql`sr.assigned_technician_id = ${assignedToTechnicianId}` : sql`true`;
  const equipmentFilter = equipmentId ? sql`sr.equipment_id = ${equipmentId}` : sql`true`;
  const priorityFilter = priority && priority !== 'all' && priority !== 'overdue' ? sql`sr.priority = ${priority}` : sql`true`;
  const overdueFilter = priority === 'overdue'
    ? sql`(sr.work_status = 'pending' and (sr.scheduled_at)::timestamptz < (now() - interval '5 days'))`
    : sql`true`;
  const approvalFilter = approval && approval !== 'all' ? sql`sr.approval_status = ${approval}` : sql`true`;

  const countRows = await sql`
    select count(*)::int as count
    from service_request sr
    where ${scopeFilter}
      and ${techFilter}
      and ${equipmentFilter}
      and ${priorityFilter}
      and ${approvalFilter}
      and ${overdueFilter}
  `;
  const total = (countRows?.[0]?.count as number) ?? 0;

  const rows = await sql`
    select sr.*, to_jsonb(e) as equipment
    from service_request sr
    left join equipment e on e.id = sr.equipment_id
    where ${scopeFilter}
      and ${techFilter}
      and ${equipmentFilter}
      and ${priorityFilter}
      and ${approvalFilter}
      and ${overdueFilter}
    order by sr.ticket_id desc nulls last
    limit ${limit} offset ${offset}
  `;

  return { rows: rows as unknown as (DbServiceRequest & { equipment: DbEquipment | null })[], total };
};

export const getServiceRequestById = async (id: string): Promise<(DbServiceRequest & { equipment: DbEquipment | null }) | null> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select sr.*, to_jsonb(e) as equipment
    from service_request sr
    left join equipment e on e.id = sr.equipment_id
    where sr.id = ${id}
    limit 1`;
  return (rows && rows.length > 0 ? (rows[0] as unknown as (DbServiceRequest & { equipment: DbEquipment | null })) : null);
};

// Compute next daily sequential ticket id in format YYYY-MM-DD-XXX (e.g., 2025-10-06-001)
export const getNextTicketId = async (at: Date = new Date()): Promise<string> => {
  try {
    const sql = getDb();
    await ensureSchema();
    const yyyy = String(at.getFullYear());
    const mm = String(at.getMonth() + 1).padStart(2, '0');
    const dd = String(at.getDate()).padStart(2, '0');
    const datePrefix = `${yyyy}-${mm}-${dd}`;

    // Select max numeric suffix for tickets that match today's prefix
    // Handle case where ticket_id might be null or table is empty
    const rows = await sql`
      select coalesce(max(
        case 
          when ticket_id is not null and ticket_id like ${datePrefix + '-%'}
          then (split_part(ticket_id, '-', 4))::int
          else 0
        end
      ), 0) as max_suffix
      from service_request
    ` as unknown as Array<{ max_suffix: number }>; 

    const maxSuffix = (rows?.[0]?.max_suffix ?? 0) as number;
    const next = String((Number.isFinite(maxSuffix) ? maxSuffix : 0) + 1).padStart(3, '0');
    return `${datePrefix}-${next}`;
  } catch (error) {
    console.error('Error in getNextTicketId:', error);
    // Fallback: return a basic ticket ID if database query fails
    const yyyy = String(at.getFullYear());
    const mm = String(at.getMonth() + 1).padStart(2, '0');
    const dd = String(at.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}-001`;
  }
};

export const insertServiceRequest = async (
  input: Omit<DbServiceRequest, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const explicitId = randomUUID();
  const createdAt = new Date();
  const ticketId = await getNextTicketId(createdAt);
  const [row] = await sql`
    insert into service_request (
      id, created_at, created_by,
      equipment_id, assigned_technician_id, request_type, scheduled_at,
      priority, approval_status, work_status,
      problem_description, technical_assessment, recommendation,
      spare_parts_needed, ticket_id
    ) values (
      ${explicitId}, ${createdAt}, ${actorId},
      ${input.equipment_id}, ${input.assigned_technician_id}, ${input.request_type}, ${input.scheduled_at},
      ${input.priority}, ${input.approval_status}, ${input.work_status},
      ${input.problem_description}, ${input.technical_assessment}, ${input.recommendation},
      ${toJsonbParam(input.spare_parts_needed)}::jsonb, ${ticketId}
    ) returning *`;
  return row;
};

export const updateServiceRequest = async (
  id: string,
  input: Omit<DbServiceRequest, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    with updated as (
      update service_request set
        updated_by = ${actorId},
        updated_at = now(),

        equipment_id = ${input.equipment_id},
        assigned_technician_id = ${input.assigned_technician_id},
        request_type = ${input.request_type},
        scheduled_at = ${input.scheduled_at},
        priority = ${input.priority},
        approval_status = ${input.approval_status},
        work_status = ${input.work_status},
        problem_description = ${input.problem_description},
        technical_assessment = ${input.technical_assessment},
        recommendation = ${input.recommendation},
        spare_parts_needed = ${toJsonbParam(input.spare_parts_needed)}::jsonb,
        approval_note = ${input.approval_note}
      where id = ${id}
      returning *
    )
    select u.*, to_jsonb(e) as equipment
    from updated u
    left join equipment e on e.id = u.equipment_id`;
  return row as unknown as (DbServiceRequest & { equipment: DbEquipment | null });
};

// Spare Parts CRUD Operations
export const listSparePartsPaginated = async (
  page: number = 1,
  pageSize: number = 10,
  q?: string
): Promise<{ rows: DbSparePart[]; total: number }> => {
  const sql = getDb();
  await ensureSchema();
  const offset = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const limit = Math.max(1, Number(pageSize));

  const textFilter = q && q.trim().length > 0
    ? sql`(
        sp.name ilike ${'%' + q + '%'} or
        sp.serial_number ilike ${'%' + q + '%'} or
        sp.manufacturer ilike ${'%' + q + '%'}
      )`
    : sql`true`;

  const countRows = await sql`
    select count(*)::int as count
    from spare_parts sp
    where sp.deleted_at is null
      and ${textFilter}
  `;
  const total = (countRows?.[0]?.count as number) ?? 0;

  const rows = await sql`
    select sp.*
    from spare_parts sp
    where sp.deleted_at is null
      and ${textFilter}
    order by sp.name asc
    limit ${limit} offset ${offset}
  `;

  return { rows: rows as unknown as DbSparePart[], total };
};

export const insertSparePart = async (
  input: Omit<DbSparePart, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    insert into spare_parts (
      created_at, created_by,
      name, serial_number, quantity, manufacturer, supplier
    ) values (
      now(), ${actorId},
      ${input.name}, ${input.serial_number}, ${input.quantity}, ${input.manufacturer}, ${input.supplier}
    ) returning *`;
  return row as unknown as DbSparePart;
};

export const updateSparePart = async (
  id: string,
  input: Omit<DbSparePart, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    update spare_parts set
      updated_by = ${actorId},
      updated_at = now(),
      name = ${input.name},
      serial_number = ${input.serial_number},
      quantity = ${input.quantity},
      manufacturer = ${input.manufacturer},
      supplier = ${input.supplier}
    where id = ${id}
    returning *`;
  return row as unknown as DbSparePart;
};

export const softDeleteSparePart = async (
  id: string,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    update spare_parts set
      deleted_by = ${actorId},
      deleted_at = now()
    where id = ${id} and deleted_at is null
    returning *`;
  return row as unknown as DbSparePart | undefined;
};

export const findOrCreateSparePart = async (
  name: string,
  manufacturer: string | undefined,
  supplier: string | undefined,
  actorId: string,
): Promise<string> => {
  const sql = getDb();
  await ensureSchema();
  
  console.log('[findOrCreateSparePart] Looking for spare part:', { name, manufacturer, supplier });
  
  // Try to find existing spare part by name (and manufacturer if provided)
  let existing;
  if (manufacturer) {
    existing = await sql`
      select id from spare_parts
      where name = ${name}
        and manufacturer = ${manufacturer}
        and deleted_at is null
      limit 1
    `;
  } else {
    existing = await sql`
      select id from spare_parts
      where name = ${name}
        and manufacturer is null
        and deleted_at is null
      limit 1
    `;
  }
  
  if (existing && existing.length > 0) {
    const id = (existing[0] as { id: string }).id;
    console.log('[findOrCreateSparePart] Found existing spare part:', id);
    return id;
  }
  
  // Create new spare part if not found
  console.log('[findOrCreateSparePart] Creating new spare part in inventory');
  const [newPart] = await sql`
    insert into spare_parts (
      created_at, created_by,
      name, quantity, manufacturer, supplier
    ) values (
      now(), ${actorId},
      ${name}, 0, ${manufacturer || null}, ${supplier || null}
    ) returning id
  `;
  
  const newId = (newPart as { id: string }).id;
  console.log('[findOrCreateSparePart] Created new spare part with ID:', newId);
  return newId;
};

export const getServiceRequestsBySparePartId = async (
  sparePartId: string
): Promise<(DbServiceRequest & { equipment: DbEquipment | null })[]> => {
  const sql = getDb();
  await ensureSchema();
  
  const rows = await sql`
    select sr.*, to_jsonb(e) as equipment
    from service_request sr
    left join equipment e on e.id = sr.equipment_id
    where sr.spare_parts_needed::text like ${'%"sparePartId":"' + sparePartId + '"%'}
    order by sr.created_at desc
  `;
  
  return rows as unknown as (DbServiceRequest & { equipment: DbEquipment | null })[];
};

// Attendance functions
export const logInAttendance = async (userId: string, employeeId?: string, displayName?: string) => {
  const sql = getDb();
  await ensureSchema();
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Check if already logged in today
  const existing = await sql`
    select id, log_in_time, log_out_time
    from attendance
    where user_id = ${userId} and date = ${today}
    limit 1
  `;
  
  if (existing && existing.length > 0) {
    // Already has a record for today, just update log_in_time if not already set
    const record = existing[0] as { id: string; log_in_time: string; log_out_time: string | null };
    if (!record.log_in_time) {
      const [updated] = await sql`
        update attendance
        set log_in_time = now(), updated_at = now()
        where id = ${record.id}
        returning *
      `;
      return updated;
    }
    return record;
  }
  
  // Create new attendance record
  const [newRecord] = await sql`
    insert into attendance (
      user_id, date, log_in_time, employee_id, display_name, created_at
    ) values (
      ${userId}, ${today}, now(), ${employeeId || null}, ${displayName || null}, now()
    ) returning *
  `;
  
  return newRecord;
};

export const logOutAttendance = async (userId: string) => {
  const sql = getDb();
  await ensureSchema();
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const [updated] = await sql`
    update attendance
    set log_out_time = now(), updated_at = now()
    where user_id = ${userId} and date = ${today}
    returning *
  `;
  
  return updated;
};

export const getTodayAttendance = async (userId: string) => {
  const sql = getDb();
  await ensureSchema();
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const result = await sql`
    select * from attendance
    where user_id = ${userId} and date = ${today}
    limit 1
  `;
  
  return result && result.length > 0 ? result[0] : null;
};

export const getAttendanceForDate = async (date: string) => {
  const sql = getDb();
  await ensureSchema();
  
  const result = await sql`
    select * from attendance
    where date = ${date}
    order by log_in_time asc
  `;
  
  return result;
};