import { neon } from '@neondatabase/serverless';
import { DbEquipment, DbServiceRequest } from './types';
import { toJsonbParam } from './utils';

// Simple Neon client factory. Uses DATABASE_URL from env.
export const getDb = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to your environment.');
  }
  return neon(connectionString);
};

// Ensure the equipment table exists (id as UUID, dates as text for now to match UI strings)
export const ensureSchema = async () => {
  return;
  const sql = getDb();
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
      spare_parts_needed jsonb
    )`;
  // Add new columns to the equipment table if they do not exist
  await sql`
    alter table equipment
      add column if not exists model text,
      add column if not exists manufacturer text,
      add column if not exists serial_number text,
      add column if not exists status text not null default 'Working'`;
};

export const listEquipmentCache = async () => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`
    select id, name from equipment where deleted_at is null;
  `;

  return { rows: rows as Pick<DbEquipment, 'id' | 'name'>[] };
}

export const listEquipmentPaginated = async (
  page: number = 1,
  pageSize: number = 4
): Promise<{ rows: (DbEquipment & { latest_pending_service_request: DbServiceRequest | null })[]; total: number }> => {
  const sql = getDb();
  await ensureSchema();
  const offset = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const limit = Math.max(1, Number(pageSize));

  const countRows = await sql`select count(*)::int as count from equipment`;
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
      name, part_number, location,
      last_maintenance, maintenance_interval, in_use
    ) values (
      now(), ${actorId},
      ${input.name}, ${input.part_number}, ${input.location},
      ${input.last_maintenance}, ${input.maintenance_interval}, ${input.in_use ?? true}
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
      last_maintenance = ${input.last_maintenance},
      maintenance_interval = ${input.maintenance_interval},
      in_use = ${input.in_use ?? true}
    where id = ${id}
    returning *`;
  return row as unknown as DbEquipment;
};

export const listServiceRequestPaginated = async (
  page: number = 1,
  pageSize: number = 50,
  scope?: 'pending' | 'completed',
  assignedToTechnicianId?: string
): Promise<{ rows: (DbServiceRequest & { equipment: DbEquipment | null })[]; total: number }> => {
  const sql = getDb();
  await ensureSchema();
  const offset = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const limit = Math.max(1, Number(pageSize));

  let total = 0;
  let rows: unknown[] = [];

  if (scope === 'pending') {
    if (assignedToTechnicianId) {
      const countRows = await sql`select count(*)::int as count from service_request sr where (sr.approval_status = 'pending' or sr.work_status = 'pending') and sr.assigned_technician_id = ${assignedToTechnicianId}`;
      total = (countRows?.[0]?.count as number) ?? 0;
      rows = await sql`
        select sr.*, to_jsonb(e) as equipment
        from service_request sr
        left join equipment e on e.id = sr.equipment_id
        where (sr.approval_status = 'pending' or sr.work_status = 'pending')
          and sr.assigned_technician_id = ${assignedToTechnicianId}
        order by sr.created_at desc
        limit ${limit} offset ${offset}
      `;
    } else {
      const countRows = await sql`select count(*)::int as count from service_request sr where (sr.approval_status = 'pending' or sr.work_status = 'pending')`;
      total = (countRows?.[0]?.count as number) ?? 0;
      rows = await sql`
        select sr.*, to_jsonb(e) as equipment
        from service_request sr
        left join equipment e on e.id = sr.equipment_id
        where (sr.approval_status = 'pending' or sr.work_status = 'pending')
        order by sr.created_at desc
        limit ${limit} offset ${offset}
      `;
    }
  } else if (scope === 'completed') {
    if (assignedToTechnicianId) {
      const countRows = await sql`select count(*)::int as count from service_request sr where (sr.approval_status <> 'pending' and sr.work_status <> 'pending') and sr.assigned_technician_id = ${assignedToTechnicianId}`;
      total = (countRows?.[0]?.count as number) ?? 0;
      rows = await sql`
        select sr.*, to_jsonb(e) as equipment
        from service_request sr
        left join equipment e on e.id = sr.equipment_id
        where (sr.approval_status <> 'pending' and sr.work_status <> 'pending')
          and sr.assigned_technician_id = ${assignedToTechnicianId}
        order by sr.created_at desc
        limit ${limit} offset ${offset}
      `;
    } else {
      const countRows = await sql`select count(*)::int as count from service_request sr where (sr.approval_status <> 'pending' and sr.work_status <> 'pending')`;
      total = (countRows?.[0]?.count as number) ?? 0;
      rows = await sql`
        select sr.*, to_jsonb(e) as equipment
        from service_request sr
        left join equipment e on e.id = sr.equipment_id
        where (sr.approval_status <> 'pending' and sr.work_status <> 'pending')
        order by sr.created_at desc
        limit ${limit} offset ${offset}
      `;
    }
  } else {
    if (assignedToTechnicianId) {
      const countRows = await sql`select count(*)::int as count from service_request sr where sr.assigned_technician_id = ${assignedToTechnicianId}`;
      total = (countRows?.[0]?.count as number) ?? 0;
      rows = await sql`
        select sr.*, to_jsonb(e) as equipment
        from service_request sr
        left join equipment e on e.id = sr.equipment_id
        where sr.assigned_technician_id = ${assignedToTechnicianId}
        order by sr.created_at desc
        limit ${limit} offset ${offset}
      `;
    } else {
      const countRows = await sql`select count(*)::int as count from service_request`;
      total = (countRows?.[0]?.count as number) ?? 0;
      rows = await sql`
        select sr.*, to_jsonb(e) as equipment
        from service_request sr
        left join equipment e on e.id = sr.equipment_id
        order by sr.created_at desc
        limit ${limit} offset ${offset}
      `;
    }
  }

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

export const insertServiceRequest = async (
  input: Omit<DbServiceRequest, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
  actorId: string,
) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    insert into service_request (
      created_at, created_by,
      equipment_id, assigned_technician_id, request_type, scheduled_at,
      priority, approval_status, work_status,
      problem_description, technical_assessment, recommendation,
      spare_parts_needed
    ) values (
      now(), ${actorId},
      ${input.equipment_id}, ${input.assigned_technician_id}, ${input.request_type}, ${input.scheduled_at},
      ${input.priority}, ${input.approval_status}, ${input.work_status},
      ${input.problem_description}, ${input.technical_assessment}, ${input.recommendation},
      ${toJsonbParam(input.spare_parts_needed)}::jsonb
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
        spare_parts_needed = ${toJsonbParam(input.spare_parts_needed)}::jsonb
      where id = ${id}
      returning *
    )
    select u.*, to_jsonb(e) as equipment
    from updated u
    left join equipment e on e.id = u.equipment_id`;
  return row as unknown as (DbServiceRequest & { equipment: DbEquipment | null });
};