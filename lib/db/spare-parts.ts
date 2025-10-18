import { getDb } from './connection';
import { DbSparePart, DbSparePartOrder } from '../types';

export const listSparePartsPaginated = async (
  page: number = 1,
  pageSize: number = 10,
  q?: string
): Promise<{ rows: DbSparePart[]; total: number }> => {
  const sql = getDb();
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
