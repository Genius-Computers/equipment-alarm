import { neon } from '@neondatabase/serverless';
import { DbEquipment } from './types';

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
      created_at timestamp not null default now(),
      updated_at timestamp,
      deleted_at timestamp,
      created_by text not null,
      updated_by text,
      deleted_by text,

      machine_name text not null,
      part_number text,
      location text,
      last_maintenance text,
      maintenance_interval text,
      in_use boolean not null default true
    )`;
};

export const listEquipment = async (): Promise<DbEquipment[]> => {
  const sql = getDb();
  await ensureSchema();
  const rows = await sql`select * from equipment order by machine_name asc`;
  return rows as unknown as DbEquipment[];
};

export const insertEquipment = async (input: Omit<DbEquipment, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    insert into equipment (
      created_at, created_by,
      machine_name, part_number, location,
      last_maintenance, maintenance_interval, in_use
    ) values (
      now(), 'anas',
      ${input.machine_name}, ${input.part_number}, ${input.location},
      ${input.last_maintenance}, ${input.maintenance_interval}, ${input.in_use ?? true}
    ) returning *`;
  return row;
};

export const updateEquipment = async (
  id: string,
  input: Omit<DbEquipment, 'id' | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
  const sql = getDb();
  await ensureSchema();
  const [row] = await sql`
    update equipment set
      updated_by = 'anas',
      updated_at = now(),

      machine_name = ${input.machine_name},
      part_number = ${input.part_number},
      location = ${input.location},
      last_maintenance = ${input.last_maintenance},
      maintenance_interval = ${input.maintenance_interval},
      in_use = ${input.in_use ?? true}
    where id = ${id}
    returning *`;
  return row as unknown as DbEquipment;
};
