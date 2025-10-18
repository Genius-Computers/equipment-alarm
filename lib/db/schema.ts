import { getDb } from './connection';

// Ensure all database tables exist with proper schema
export const ensureSchema = async () => {
  const sql = getDb();
  
  // Enable required extensions
  await sql`create extension if not exists pgcrypto`;
  
  // Create locations table FIRST (equipment references it)
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

  // Create equipment table
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
      maintenance_interval text,
      location_id uuid references locations(id)
    )`;

  // Create service_request table
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
      ticket_id text not null,
      approval_note text
    )`;

  // Create spare_parts table
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

  // Create spare_part_orders table
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

  // Create attendance table
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

  // Create job_orders table
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

  // Apply schema migrations
  await applySchemaMigrations(sql);
};

// Apply incremental schema changes (migrations)
const applySchemaMigrations = async (sql: ReturnType<typeof getDb>) => {
  // Add new columns to equipment table if they do not exist
  await sql`
    alter table equipment
      add column if not exists model text,
      add column if not exists manufacturer text,
      add column if not exists serial_number text,
      add column if not exists status text not null default 'Working',
      add column if not exists sub_location text,
      add column if not exists location_id uuid references locations(id)`;

  // Add new columns to service_request table if they do not exist
  await sql`
    alter table service_request
      add column if not exists ticket_id text,
      add column if not exists approval_note text
  `;
  
  // Remove NOT NULL constraint from assigned_technician_id to allow unassigned requests
  try {
    await sql`alter table service_request alter column assigned_technician_id drop not null`;
  } catch {
    // Ignore if constraint doesn't exist
  }

  // Add name_ar column to locations if it doesn't exist
  await sql`
    alter table locations
      add column if not exists name_ar text
  `;

  // Make log_in_time nullable in attendance table
  try {
    await sql`
      alter table attendance
        alter column log_in_time drop not null
    `;
  } catch (error) {
    // Ignore error if column is already nullable
    console.log('[DB] log_in_time column already nullable or error:', error);
  }
  
  // Add supplier column to spare_parts if it doesn't exist
  await sql`
    alter table spare_parts
      add column if not exists supplier text
  `;
};
