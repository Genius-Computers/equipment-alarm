import { neon } from '@neondatabase/serverless';

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
  const sql = getDb();
  await sql`create extension if not exists pgcrypto`;
  await sql`
    create table if not exists equipment (
      id uuid primary key default gen_random_uuid(),
      machine_name text not null,
      part_number text not null,
      location text not null,
      last_maintenance text not null,
      next_maintenance text not null,
      maintenance_interval text not null,
      spare_parts_needed boolean not null default false,
      spare_parts_approved boolean not null default false,
      in_use boolean not null default true
    )`;
};

export type EquipmentRow = {
  id: string;
  machine_name: string;
  part_number: string;
  location: string;
  last_maintenance: string;
  next_maintenance: string;
  maintenance_interval: string;
  spare_parts_needed: boolean;
  spare_parts_approved: boolean;
  in_use: boolean;
};

export const listEquipment = async (): Promise<EquipmentRow[]> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`select * from equipment order by machine_name asc`;
  return rows as unknown as EquipmentRow[];
};

export const insertEquipment = async (input: {
  machine_name: string;
  part_number: string;
  location: string;
  last_maintenance: string;
  next_maintenance: string;
  maintenance_interval: string;
  spare_parts_needed: boolean;
  spare_parts_approved?: boolean;
  in_use?: boolean;
}) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    insert into equipment (
      machine_name, part_number, location,
      last_maintenance, next_maintenance, maintenance_interval,
      spare_parts_needed, spare_parts_approved, in_use
    ) values (
      ${input.machine_name}, ${input.part_number}, ${input.location},
      ${input.last_maintenance}, ${input.next_maintenance}, ${input.maintenance_interval},
      ${input.spare_parts_needed}, ${input.spare_parts_approved ?? false}, ${input.in_use ?? true}
    ) returning *`;
  return row;
};


export const updateEquipment = async (
  id: string,
  input: {
    machine_name: string;
    part_number: string;
    location: string;
    last_maintenance: string;
    next_maintenance: string;
    maintenance_interval: string;
    spare_parts_needed: boolean;
    spare_parts_approved?: boolean;
    in_use?: boolean;
  }
) => {
  const sql = getDb();
  await ensureSchema();
  const inUseParam = input.in_use ?? null;
  const [row] = await sql`
    update equipment set
      machine_name = ${input.machine_name},
      part_number = ${input.part_number},
      location = ${input.location},
      last_maintenance = ${input.last_maintenance},
      next_maintenance = ${input.next_maintenance},
      maintenance_interval = ${input.maintenance_interval},
      spare_parts_needed = ${input.spare_parts_needed},
      spare_parts_approved = ${input.spare_parts_approved ?? false},
      in_use = coalesce(${inUseParam}::boolean, in_use)
    where id = ${id}
    returning *`;
  return row as unknown as EquipmentRow;
};
