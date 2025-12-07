import { getDb } from './connection';
import { DbEquipment, DbServiceRequest } from '../types';

export const listEquipmentPaginated = async (
  page: number = 1,
  pageSize: number = 4,
  q?: string,
  locationId?: string,
): Promise<{ rows: (DbEquipment & { latest_pending_service_request: DbServiceRequest | null })[]; total: number }> => {
  const sql = getDb();
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

  const locationFilter = locationId
    ? sql`e.location_id = ${locationId}`
    : sql`true`;

  const countRows = await sql`
    select count(*)::int as count
    from equipment e
    where e.deleted_at is null
      and ${textFilter}
      and ${locationFilter}
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
      and ${locationFilter}
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

export const updateEquipmentLastMaintenance = async (
  id: string,
  lastMaintenance: string,
  actorId: string,
) => {
  const sql = getDb();
  await sql`
    update equipment set
      updated_by = ${actorId},
      updated_at = now(),
      last_maintenance = ${lastMaintenance}
    where id = ${id} and deleted_at is null
  `;
};

export const updateEquipmentStatus = async (
  id: string,
  status: string,
  actorId: string,
) => {
  const sql = getDb();
  await sql`
    update equipment set
      updated_by = ${actorId},
      updated_at = now(),
      status = ${status}
    where id = ${id} and deleted_at is null
  `;
};

export const softDeleteEquipment = async (
  id: string,
  actorId: string,
) => {
  const sql = getDb();
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

  // Upsert by tag number (part_number), update fields if existing and not deleted
  const rows = await sql`
    with incoming as (
      select
        now() as created_at, ${actorId} as created_by,
        t.name, t.part_number, t.model, t.manufacturer, t.serial_number,
        t.location, t.sub_location, t.location_id::uuid as location_id, t.status,
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
    ), updated as (
      update equipment e
      set
        updated_at = now(),
        updated_by = ${actorId},
        name = i.name,
        model = i.model,
        manufacturer = i.manufacturer,
        serial_number = i.serial_number,
        location = i.location,
        sub_location = i.sub_location,
        location_id = i.location_id,
        status = i.status,
        last_maintenance = i.last_maintenance,
        maintenance_interval = i.maintenance_interval
      from incoming i
      where lower(e.part_number) = lower(i.part_number)
        and e.deleted_at is null
      returning e.*
    ), inserted as (
      insert into equipment (
        created_at, created_by,
        name, part_number, model, manufacturer, serial_number,
        location, sub_location, location_id, status,
        last_maintenance, maintenance_interval
      )
      select
        i.created_at, i.created_by,
        i.name, i.part_number, i.model, i.manufacturer, i.serial_number,
        i.location, i.sub_location, i.location_id, i.status,
        i.last_maintenance, i.maintenance_interval
      from incoming i
      where not exists (
        select 1 from equipment e
        where e.deleted_at is null and lower(e.part_number) = lower(i.part_number)
      )
      returning *
    )
    select * from updated
    union all
    select * from inserted`;
  return rows as unknown as DbEquipment[];
};

export const getEquipmentById = async (id: string): Promise<DbEquipment | null> => {
  const sql = getDb();
  const rows = await sql`
    select * from equipment e
    where e.id = ${id} and e.deleted_at is null
    limit 1
  `;
  return (rows && rows.length > 0 ? (rows[0] as unknown as DbEquipment) : null);
}

export const getEquipmentIdByPartNumber = async (partNumber: string): Promise<string | null> => {
  try {
    const sql = getDb();
    const rows = await sql`
      select id
      from equipment e
      where e.deleted_at is null and lower(trim(e.part_number)) = lower(trim(${partNumber}))
      limit 1
    ` as Array<{ id: string }>;
    return rows && rows.length > 0 ? rows[0].id : null;
  } catch (error) {
    // Avoid crashing the page; log and return null so caller can render gracefully
    console.error('Error connecting to database:', error);
    return null;
  }
}

export const getUniqueSubLocationsByLocation = async (location: string): Promise<string[]> => {
  const sql = getDb();
  
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

export const getEquipmentWithLocationInfo = async (equipmentId: string) => {
  const sql = getDb();
  
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
