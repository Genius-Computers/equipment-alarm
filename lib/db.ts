import { neon } from '@neondatabase/serverless';
import { DbEquipment, DbServiceRequest, DbSparePart, DbLocation, DbJobOrder, DbSparePartOrder } from './types';
import { toJsonbParam } from './utils';
import { randomUUID } from 'crypto';

// Simple Neon client factory. Uses DATABASE_URL from env.
// In development, uses DEV_DATABASE_URL if available, otherwise falls back to DATABASE_URL
export const getDb = () => {
  let connectionString = process.env.DATABASE_URL;
  
  // Use development database if in development mode and DEV_DATABASE_URL is set
  if (process.env.NODE_ENV === 'development' && process.env.DEV_DATABASE_URL) {
    connectionString = process.env.DEV_DATABASE_URL;
  }
  
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
      model text,
      manufacturer text,
      serial_number text,
      location text,
      sub_location text,
      status text not null default 'Working',
      last_maintenance text,
      maintenance_interval text
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
      assigned_technician_id uuid,
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
      add column if not exists sub_location text,
      add column if not exists location_id uuid references locations(id)`;

  await sql`
    alter table service_request
      add column if not exists ticket_id text,
      add column if not exists approval_note text
  `;
  
  // Remove NOT NULL constraint from assigned_technician_id to allow unassigned requests
  try {
    await sql`alter table service_request alter column assigned_technician_id drop not null`;
  } catch (e) {
    // Ignore if constraint doesn't exist
  }

  await sql`
    create table if not exists locations (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp not null default now(),
      updated_at timestamp,
      deleted_at timestamp,
      created_by text not null,
      updated_by text,
      deleted_by text,

      campus text not null,
      name text not null,
      name_ar text,
      
      unique(campus, name)
    )`;
  
  // Add name_ar column if it doesn't exist
  await sql`
    alter table locations
      add column if not exists name_ar text
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
    create table if not exists spare_part_orders (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp not null default now(),
      updated_at timestamp,
      deleted_at timestamp,
      created_by text not null,
      updated_by text,
      deleted_by text,

      status text not null default 'Pending Technician Action',
      items jsonb not null default '[]'::jsonb,
      supervisor_notes text,
      technician_notes text,
      submitted_to_supervisor_at timestamp,
      completed_at timestamp
    )`;

  await sql`
    create table if not exists attendance (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      date date not null,
      log_in_time timestamp,
      log_out_time timestamp,
      employee_id text,
      display_name text,
      created_at timestamp not null default now(),
      updated_at timestamp,
      unique(user_id, date)
    )`;
  
  // Alter existing attendance table to make log_in_time nullable (if not already)
  try {
    await sql`
      alter table attendance
        alter column log_in_time drop not null
    `;
  } catch (e) {
    // Ignore error if column is already nullable
    console.log('[DB] log_in_time column already nullable or error:', e);
  }
  
  await sql`
    alter table spare_parts
      add column if not exists supplier text
  `;

  await sql`
    create table if not exists job_orders (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp not null default now(),
      updated_at timestamp,
      deleted_at timestamp,
      created_by text not null,
      updated_by text,
      deleted_by text,

      order_number text not null unique,
      campus text not null,
      sublocation text not null,
      items jsonb not null,
      status text not null default 'draft',
      submitted_by text,
      submitted_at timestamp
    )`;
  
  schemaInitialized = true;
};

export const listEquipmentCache = async () => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select id, name, part_number, model, manufacturer, serial_number, location, sub_location, status
    from equipment
    where deleted_at is null;
  `;

  return { rows: rows as Pick<DbEquipment, 'id' | 'name' | 'part_number' | 'model' | 'manufacturer' | 'serial_number' | 'location' | 'sub_location' | 'status'>[] };
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
        e.model ilike ${'%' + q + '%'} or
        e.manufacturer ilike ${'%' + q + '%'} or
        e.serial_number ilike ${'%' + q + '%'} or
        e.location ilike ${'%' + q + '%'} or
        e.sub_location ilike ${'%' + q + '%'}
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
      l.name as location_name,
      l.campus,
      to_jsonb(s) as latest_pending_service_request
    from equipment e
    left join locations l on e.location_id = l.id and l.deleted_at is null
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
      name, part_number, model, manufacturer, serial_number,
      location, sub_location, location_id, status,
      last_maintenance, maintenance_interval
    ) values (
      now(), ${actorId},
      ${input.name}, ${input.part_number}, ${input.model}, ${input.manufacturer}, ${input.serial_number},
      ${input.location}, ${input.sub_location}, ${input.location_id}, ${input.status},
      ${input.last_maintenance}, ${input.maintenance_interval}
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
      model = ${input.model},
      manufacturer = ${input.manufacturer},
      serial_number = ${input.serial_number},
      location = ${input.location},
      sub_location = ${input.sub_location},
      location_id = ${input.location_id},
      status = ${input.status},
      last_maintenance = ${input.last_maintenance},
      maintenance_interval = ${input.maintenance_interval}
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

export const bulkSoftDeleteEquipment = async (
  ids: string[],
  actorId: string,
): Promise<{ deleted: number; failed: number }> => {
  if (!ids || ids.length === 0) {
    return { deleted: 0, failed: 0 };
  }
  
  const sql = getDb();
  await ensureSchema();
  
  const rows = await sql`
    update equipment set
      deleted_by = ${actorId},
      deleted_at = now()
    where id = any(${ids}::uuid[]) and deleted_at is null
    returning id`;
  
  return { 
    deleted: rows.length,
    failed: ids.length - rows.length 
  };
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
  const models = inputs.map((i) => i.model ?? null);
  const manufacturers = inputs.map((i) => i.manufacturer ?? null);
  const serialNumbers = inputs.map((i) => i.serial_number ?? null);
  const locations = inputs.map((i) => i.location ?? null);
  const subLocations = inputs.map((i) => i.sub_location ?? null);
  const locationIds = inputs.map((i) => i.location_id ?? null);
  const statuses = inputs.map((i) => i.status ?? 'Working');
  const lastMaintenance = inputs.map((i) => i.last_maintenance ?? null);
  const maintenanceIntervals = inputs.map((i) => i.maintenance_interval ?? null);

  const rows = await sql`
    insert into equipment (
      created_at, created_by,
      name, part_number, model, manufacturer, serial_number,
      location, sub_location, location_id, status,
      last_maintenance, maintenance_interval
    )
    select
      now(), ${actorId},
      t.name, t.part_number, t.model, t.manufacturer, t.serial_number,
      t.location, t.sub_location, t.location_id::uuid, t.status,
      t.last_maintenance, t.maintenance_interval
    from unnest(
      ${names}::text[],
      ${partNumbers}::text[],
      ${models}::text[],
      ${manufacturers}::text[],
      ${serialNumbers}::text[],
      ${locations}::text[],
      ${subLocations}::text[],
      ${locationIds}::text[],
      ${statuses}::text[],
      ${lastMaintenance}::text[],
      ${maintenanceIntervals}::text[]
    ) as t(
      name, part_number, model, manufacturer, serial_number,
      location, sub_location, location_id, status,
      last_maintenance, maintenance_interval
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

export const validateLocationExists = async (campus: string, name: string): Promise<boolean> => {
  const sql = getDb();
  await ensureSchema();
  
  const rows = await sql`
    select id from locations
    where campus = ${campus}
      and name = ${name}
      and deleted_at is null
    limit 1
  `;
  
  return rows && rows.length > 0;
}

export const getUniqueSubLocationsByLocation = async (location: string): Promise<string[]> => {
  const sql = getDb();
  await ensureSchema();
  
  // Fetch from locations table
  const locationsRows = await sql`
    select name
    from locations
    where campus = ${location}
      and deleted_at is null
    order by name asc
  `;
  
  // Also fetch from equipment for backward compatibility
  const equipmentRows = await sql`
    select distinct sub_location
    from equipment
    where location = ${location}
      and sub_location is not null
      and sub_location != ''
      and deleted_at is null
  `;
  
  // Combine and deduplicate
  const locationNames = locationsRows.map((r) => (r as { name: string }).name);
  const equipmentLocations = equipmentRows.map((r) => (r as { sub_location: string }).sub_location);
  const combined = [...new Set([...locationNames, ...equipmentLocations])];
  
  return combined.sort();
};

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
  
  console.log('[DB listServiceRequestPaginated] Called with:', { page, pageSize, scope, assignedToTechnicianId, equipmentId, priority, approval });

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
    where sr.deleted_at is null
      and ${scopeFilter}
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
    left join equipment e on e.id = sr.equipment_id and e.deleted_at is null
    where sr.deleted_at is null
      and ${scopeFilter}
      and ${techFilter}
      and ${equipmentFilter}
      and ${priorityFilter}
      and ${approvalFilter}
      and ${overdueFilter}
    order by sr.created_at desc nulls last
    limit ${limit} offset ${offset}
  `;
  
  console.log('[DB listServiceRequestPaginated] Query returned:', rows.length, 'rows, total count:', total);

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

// Compute next yearly sequential ticket id in format YY-XXXX (e.g., 25-0001, 25-0002)
// Uses advisory lock to prevent race conditions when generating ticket numbers
export const getNextTicketId = async (at: Date = new Date()): Promise<string> => {
  try {
    const sql = getDb();
    await ensureSchema();
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

// =========== SPARE PART ORDERS ===========

export const createSparePartOrder = async (
  items: string, // JSON stringified array
  supervisorNotes: string | undefined,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    insert into spare_part_orders (
      created_at, created_by,
      status, items, supervisor_notes
    ) values (
      now(), ${actorId},
      'Pending Technician Action', ${items}::jsonb, ${supervisorNotes || null}
    ) returning *`;
  return row as unknown as DbSparePartOrder;
};

export const updateSparePartOrder = async (
  id: string,
  status: string,
  items: string, // JSON stringified array
  supervisorNotes: string | undefined,
  technicianNotes: string | undefined,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  
  const updateFields: Record<string, unknown> = {
    updated_by: actorId,
    updated_at: sql`now()`,
    status,
    items: sql`${items}::jsonb`,
  };
  
  if (supervisorNotes !== undefined) {
    updateFields.supervisor_notes = supervisorNotes;
  }
  
  if (technicianNotes !== undefined) {
    updateFields.technician_notes = technicianNotes;
  }
  
  // If status is changing to "Pending Supervisor Review", set submitted_to_supervisor_at
  if (status === 'Pending Supervisor Review') {
    updateFields.submitted_to_supervisor_at = sql`now()`;
  }
  
  // If status is changing to "Completed" or "Approved", set completed_at
  if (status === 'Completed' || status === 'Approved') {
    updateFields.completed_at = sql`now()`;
  }
  
  const [row] = await sql`
    update spare_part_orders set
      updated_by = ${actorId},
      updated_at = now(),
      status = ${status},
      items = ${items}::jsonb,
      supervisor_notes = ${supervisorNotes || null},
      technician_notes = ${technicianNotes || null},
      ${status === 'Pending Supervisor Review' ? sql`submitted_to_supervisor_at = now(),` : sql``}
      ${status === 'Completed' || status === 'Approved' ? sql`completed_at = now()` : sql`completed_at = completed_at`}
    where id = ${id}
    returning *`;
  return row as unknown as DbSparePartOrder;
};

export const listSparePartOrders = async (
  statusFilter?: string
): Promise<DbSparePartOrder[]> => {
  const sql = getDb();
  await ensureSchema();
  
  const statusCondition = statusFilter 
    ? sql`and status = ${statusFilter}`
    : sql``;
  
  const rows = await sql`
    select *
    from spare_part_orders
    where deleted_at is null
      ${statusCondition}
    order by created_at desc
  `;
  
  return rows as unknown as DbSparePartOrder[];
};

export const getSparePartOrderById = async (
  id: string
): Promise<DbSparePartOrder | null> => {
  const sql = getDb();
  await ensureSchema();
  
  const [row] = await sql`
    select *
    from spare_part_orders
    where id = ${id} and deleted_at is null
    limit 1
  `;
  
  return row ? (row as unknown as DbSparePartOrder) : null;
};

export const softDeleteSparePartOrder = async (
  id: string,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    update spare_part_orders set
      deleted_by = ${actorId},
      deleted_at = now()
    where id = ${id} and deleted_at is null
    returning *`;
  return row as unknown as DbSparePartOrder | undefined;
};

/**
 * Updates spare parts inventory when an order is completed
 * Adds the quantitySupplied from each order item to the inventory
 */
export const addSparePartOrderToInventory = async (
  orderId: string,
  actorId: string,
): Promise<void> => {
  const sql = getDb();
  await ensureSchema();
  
  // Get the order with its items
  const order = await getSparePartOrderById(orderId);
  if (!order) {
    throw new Error('Spare part order not found');
  }
  
  // Parse the items from JSON
  const items = typeof order.items === 'string' 
    ? JSON.parse(order.items) 
    : order.items;
  
  console.log(`[addSparePartOrderToInventory] Processing ${items.length} items from order ${orderId}`);
  
  // Update inventory for each item
  for (const item of items) {
    const quantityToAdd = item.quantitySupplied || 0;
    
    if (quantityToAdd <= 0) {
      console.log(`[addSparePartOrderToInventory] Skipping item with no quantity supplied:`, item);
      continue;
    }
    
    // Find or create the spare part in inventory
    let sparePartId: string | null = null;
    
    if (item.sparePartName) {
      // Use findOrCreateSparePart to get/create the spare part
      sparePartId = await findOrCreateSparePart(
        item.sparePartName,
        undefined, // manufacturer not tracked in order items
        undefined, // supplier not tracked in order items
        actorId
      );
      console.log(`[addSparePartOrderToInventory] Found/created spare part ID: ${sparePartId} for "${item.sparePartName}"`);
    }
    
    if (!sparePartId) {
      console.log(`[addSparePartOrderToInventory] Skipping item without spare part name:`, item);
      continue;
    }
    
    // Get current spare part to update quantity
    const [currentPart] = await sql`
      select * from spare_parts
      where id = ${sparePartId} and deleted_at is null
      limit 1
    `;
    
    if (currentPart) {
      const current = currentPart as unknown as DbSparePart;
      const newQuantity = current.quantity + quantityToAdd;
      
      await sql`
        update spare_parts set
          updated_by = ${actorId},
          updated_at = now(),
          quantity = ${newQuantity}
        where id = ${sparePartId}
      `;
      
      console.log(`[addSparePartOrderToInventory] Updated "${item.sparePartName}" quantity: ${current.quantity} + ${quantityToAdd} = ${newQuantity}`);
    }
  }
  
  console.log(`[addSparePartOrderToInventory] Successfully processed order ${orderId}`);
};

export const getServiceRequestsBySparePartId = async (
  sparePartId: string
): Promise<(DbServiceRequest & { equipment: DbEquipment | null })[]> => {
  const sql = getDb();
  await ensureSchema();
  
  console.log('[getServiceRequestsBySparePartId] Searching for spare part ID:', sparePartId);
  
  // First, let's see all service requests with spare parts to debug
  const allWithParts = await sql`
    select id, ticket_id, spare_parts_needed
    from service_request
    where spare_parts_needed is not null
      and jsonb_array_length(spare_parts_needed) > 0
  `;
  console.log('[getServiceRequestsBySparePartId] Total service requests with spare parts:', allWithParts.length);
  if (allWithParts.length > 0) {
    console.log('[getServiceRequestsBySparePartId] Sample spare_parts_needed:', allWithParts[0]);
  }
  
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
  
  console.log('[getServiceRequestsBySparePartId] Found', rows.length, 'service requests matching spare part ID');
  
  return rows as unknown as (DbServiceRequest & { equipment: DbEquipment | null })[];
};

// Attendance functions
export const logInAttendance = async (userId: string, employeeId?: string, displayName?: string) => {
  const sql = getDb();
  await ensureSchema();
  
  // Get today's date in Saudi timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }); // YYYY-MM-DD
  
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
  
  // Get today's date in Saudi timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }); // YYYY-MM-DD
  
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
  
  // Get today's date in Saudi timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }); // YYYY-MM-DD
  
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

// ==================== Locations ====================

export const listLocationsByCampus = async (campus: string): Promise<DbLocation[]> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select * from locations
    where campus = ${campus}
      and deleted_at is null
    order by name asc
  `;
  return rows as unknown as DbLocation[];
};

export const findOrCreateLocation = async (
  campus: string,
  name: string,
  actorId: string,
): Promise<string> => {
  const sql = getDb();
  await ensureSchema();
  
  // Try to find existing location
  const existing = await sql`
    select id from locations
    where campus = ${campus}
      and name = ${name}
      and deleted_at is null
    limit 1
  `;
  
  if (existing && existing.length > 0) {
    return (existing[0] as { id: string }).id;
  }
  
  // Create new location
  try {
    const [newLocation] = await sql`
      insert into locations (
        created_at, created_by,
        campus, name
      ) values (
        now(), ${actorId},
        ${campus}, ${name}
      ) returning id
    `;
    
    return (newLocation as { id: string }).id;
  } catch (error) {
    // If there's a unique constraint violation, try to find it again
    // (race condition handling)
    const retry = await sql`
      select id from locations
      where campus = ${campus}
        and name = ${name}
        and deleted_at is null
      limit 1
    `;
    
    if (retry && retry.length > 0) {
      return (retry[0] as { id: string }).id;
    }
    
    throw error;
  }
};

export const insertLocation = async (
  campus: string,
  name: string,
  actorId: string,
  nameAr?: string,
): Promise<DbLocation> => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    insert into locations (
      created_at, created_by,
      campus, name, name_ar
    ) values (
      now(), ${actorId},
      ${campus}, ${name}, ${nameAr || null}
    ) returning *
  `;
  return row as unknown as DbLocation;
};

export const softDeleteLocation = async (
  id: string,
  actorId: string,
): Promise<DbLocation | undefined> => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    update locations set
      deleted_at = now(),
      deleted_by = ${actorId}
    where id = ${id} and deleted_at is null
    returning *
  `;
  return row as unknown as DbLocation | undefined;
};

export const deleteAllLocations = async (actorId: string): Promise<number> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    update locations set
      deleted_at = now(),
      deleted_by = ${actorId}
    where deleted_at is null
    returning id
  `;
  return rows.length;
};

// New function to list all locations with campus info
export const listAllLocations = async (): Promise<DbLocation[]> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select * from locations
    where deleted_at is null
    order by campus asc, name asc
  `;
  return rows as unknown as DbLocation[];
};

export const getLocationById = async (id: string): Promise<DbLocation | null> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select * from locations
    where id = ${id} and deleted_at is null
    limit 1
  `;
  return rows.length > 0 ? (rows[0] as unknown as DbLocation) : null;
};

// ==================== Equipment with Location Info ====================

export const getEquipmentWithLocationInfo = async (equipmentId: string) => {
  const sql = getDb();
  await ensureSchema();
  
  const rows = await sql`
    select 
      e.*,
      l.name as location_name,
      l.campus
    from equipment e
    left join locations l on e.location_id = l.id and l.deleted_at is null
    where e.id = ${equipmentId} and e.deleted_at is null
    limit 1
  `;
  
  return rows.length > 0 ? rows[0] : null;
};


// ==================== Data Migration ====================

export const migrateEquipmentToNewLocationStructure = async (actorId: string): Promise<{ updated: number; errors: string[] }> => {
  const sql = getDb();
  await ensureSchema();
  
  let updated = 0;
  const errors: string[] = [];

  try {
    // Get all equipment that has legacy location data but no location_id
    const equipmentToMigrate = await sql`
      select id, location, sub_location
      from equipment
      where location is not null
        and sub_location is not null
        and location_id is null
        and deleted_at is null
    `;

    console.log(`Found ${equipmentToMigrate.length} equipment records to migrate`);

    // Process each equipment record
    for (const equipment of equipmentToMigrate) {
      const { id, location: campus, sub_location: locationName } = equipment as { 
        id: string; 
        location: string; 
        sub_location: string; 
      };

      try {
        // Find or create the location
        const locationId = await findOrCreateLocation(campus, locationName, actorId);
        
        // Update the equipment with the location_id
        await sql`
          update equipment
          set location_id = ${locationId}, updated_at = now(), updated_by = ${actorId}
          where id = ${id}
        `;
        
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`Migrated ${updated} equipment records so far...`);
        }
      } catch (error) {
        const errorMessage = `Failed to migrate equipment ${id} (${campus} -> ${locationName}): ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    console.log(`Migration completed. Updated: ${updated}, Errors: ${errors.length}`);
    return { updated, errors };
  } catch (error) {
    const errorMessage = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// ==================== Job Orders ====================

export const generateOrderNumber = async (firstTicketNumber: string): Promise<string> => {
  const sql = getDb();
  
  // Job order number is "JO" + first ticket number
  // Check if this order number already exists (due to race condition)
  const proposedNumber = `JO${firstTicketNumber}`;
  
  const existing = await sql`
    select order_number from job_orders
    where order_number = ${proposedNumber}
    limit 1
  `;
  
  if (existing && existing.length > 0) {
    // Order number collision - append timestamp to make unique
    const timestamp = Date.now().toString().slice(-3);
    return `${proposedNumber}-${timestamp}`;
  }
  
  return proposedNumber;
};

export const createJobOrder = async (
  campus: string,
  sublocation: string,
  items: string,
  actorId: string,
  firstTicketNumber: string
): Promise<DbJobOrder> => {
  const sql = getDb();
  await ensureSchema();
  
  const orderNumber = await generateOrderNumber(firstTicketNumber);
  
  const [row] = await sql`
    insert into job_orders (
      created_at, created_by,
      order_number, campus, sublocation, items, status
    ) values (
      now(), ${actorId},
      ${orderNumber}, ${campus}, ${sublocation}, ${items}::jsonb, 'submitted'
    ) returning *
  `;
  
  return row as unknown as DbJobOrder;
};

export const getJobOrderById = async (id: string): Promise<DbJobOrder | null> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select * from job_orders
    where id = ${id} and deleted_at is null
    limit 1
  `;
  return (rows && rows.length > 0 ? (rows[0] as unknown as DbJobOrder) : null);
};

export const submitJobOrder = async (
  id: string,
  actorId: string,
  serviceRequestData?: {
    requestType: string;
    priority: string;
    scheduledAt: string;
    assignedTechnicianId?: string;
    notes?: string;
  }
): Promise<DbJobOrder | null> => {
  const sql = getDb();
  await ensureSchema();
  
  // First, get the job order to access its items
  const jobOrder = await getJobOrderById(id);
  if (!jobOrder) return null;
  
  // Parse items
  const items = typeof jobOrder.items === 'string' 
    ? JSON.parse(jobOrder.items) 
    : jobOrder.items;
  
  // Update the job order status
  const [row] = await sql`
    update job_orders set
      status = 'submitted',
      submitted_by = ${actorId},
      submitted_at = now(),
      updated_at = now(),
      updated_by = ${actorId}
    where id = ${id} and deleted_at is null
    returning *
  `;
  
  // Create service requests for each equipment item
  if (row && Array.isArray(items)) {
    const orderNumber = (row as { order_number: string }).order_number;
    const requestType = serviceRequestData?.requestType || 'preventive_maintenance';
    const priority = serviceRequestData?.priority || 'medium';
    const scheduledAt = serviceRequestData?.scheduledAt || new Date().toISOString();
    const assignedTechnicianId = serviceRequestData?.assignedTechnicianId === 'unassigned' || !serviceRequestData?.assignedTechnicianId 
      ? null 
      : serviceRequestData.assignedTechnicianId;
    const additionalNotes = serviceRequestData?.notes ? `\n\nNotes: ${serviceRequestData.notes}` : '';
    
    console.log('[submitJobOrder] Creating service requests for', items.length, 'items');
    console.log('[submitJobOrder] Service request parameters:', { requestType, priority, scheduledAt, assignedTechnicianId });
    
    for (const item of items) {
      try {
        const problemDescription = `Job Order ${orderNumber} - ${item.equipmentName}${additionalNotes}`;
        
        console.log('[submitJobOrder] Creating service request for:', item.equipmentName, 'Ticket:', item.ticketNumber);
        
        const result = await sql`
          insert into service_request (
            id, created_at, created_by,
            equipment_id, assigned_technician_id, request_type, scheduled_at,
            priority, approval_status, work_status,
            problem_description, ticket_id
          ) values (
            gen_random_uuid(), now(), ${actorId},
            ${item.equipmentId}, ${assignedTechnicianId}, ${requestType}, ${scheduledAt},
            ${priority}, 'pending', 'pending',
            ${problemDescription}, ${item.ticketNumber}
          )
          returning id, ticket_id, approval_status, work_status
        `;
        
        console.log('[submitJobOrder] Service request created successfully:', result[0]);
      } catch (error) {
        console.error('[submitJobOrder] FAILED to create service request for equipment:', item.equipmentId);
        console.error('[submitJobOrder] Error:', error);
        console.error('[submitJobOrder] Error details:', error instanceof Error ? error.message : 'Unknown error');
        console.error('[submitJobOrder] Error stack:', error instanceof Error ? error.stack : 'No stack');
        // Continue with other items even if one fails
      }
    }
    console.log('[submitJobOrder] Finished creating service requests');
  } else {
    console.error('[submitJobOrder] ERROR: No row returned or items is not an array!', { hasRow: !!row, isArray: Array.isArray(items) });
  }
  
  return row ? (row as unknown as DbJobOrder) : null;
};

export const listJobOrdersPaginated = async (
  page: number = 1,
  pageSize: number = 10,
  status?: string
): Promise<{ data: DbJobOrder[]; total: number; page: number; pageSize: number }> => {
  const sql = getDb();
  await ensureSchema();
  
  const offset = (page - 1) * pageSize;
  
  let rows;
  let countResult;
  
  if (status) {
    rows = await sql`
      select * from job_orders
      where deleted_at is null and status = ${status}
      order by created_at desc
      limit ${pageSize} offset ${offset}
    `;
    countResult = await sql`
      select count(*) as count from job_orders
      where deleted_at is null and status = ${status}
    `;
  } else {
    rows = await sql`
      select * from job_orders
      where deleted_at is null
      order by created_at desc
      limit ${pageSize} offset ${offset}
    `;
    countResult = await sql`
      select count(*) as count from job_orders
      where deleted_at is null
    `;
  }
  
  const total = Number((countResult[0] as { count: number }).count);
  
  return {
    data: rows as unknown as DbJobOrder[],
    total,
    page,
    pageSize,
  };
};