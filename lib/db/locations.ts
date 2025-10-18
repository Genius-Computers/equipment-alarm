import { getDb } from './connection';
import { DbLocation } from '../types';

export const validateLocationExists = async (campus: string, name: string): Promise<boolean> => {
  const sql = getDb();
  
  const rows = await sql`
    select id from locations
    where campus = ${campus}
      and name = ${name}
      and deleted_at is null
    limit 1
  `;
  
  return rows && rows.length > 0;
}

export const listLocationsByCampus = async (campus: string): Promise<DbLocation[]> => {
  const sql = getDb();
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
  const rows = await sql`
    select * from locations
    where deleted_at is null
    order by campus asc, name asc
  `;
  return rows as unknown as DbLocation[];
};

export const getLocationById = async (id: string): Promise<DbLocation | null> => {
  const sql = getDb();
  const rows = await sql`
    select * from locations
    where id = ${id} and deleted_at is null
    limit 1
  `;
  return rows.length > 0 ? (rows[0] as unknown as DbLocation) : null;
};
