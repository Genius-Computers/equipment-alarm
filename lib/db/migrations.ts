import { getDb } from './connection';
import { findOrCreateLocation } from './locations';

/**
 * Migrates equipment records from legacy location structure to new location structure
 * This function updates equipment records that have legacy location data but no location_id
 */
export const migrateEquipmentToNewLocationStructure = async (actorId: string): Promise<{ updated: number; errors: string[] }> => {
  const sql = getDb();
  
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
