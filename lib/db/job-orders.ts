import { getDb } from './connection';
import { DbJobOrder } from '../types';
import { getEquipmentWithLocationInfo } from './equipment';

const generateOrderNumber = async (firstTicketNumber: string): Promise<string> => {
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
    assignedTechnicianIds?: string[];
    notes?: string;
  }
): Promise<DbJobOrder | null> => {
  const sql = getDb();
  
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
    const allAssignedTechnicianIds = Array.isArray(serviceRequestData?.assignedTechnicianIds)
      ? serviceRequestData!.assignedTechnicianIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
      : [];
    const assignedTechnicianId = allAssignedTechnicianIds.length > 0 ? allAssignedTechnicianIds[0] : null;
    const assignedTechnicianIdsJson = allAssignedTechnicianIds.length > 0 ? JSON.stringify(allAssignedTechnicianIds) : null;
    const additionalNotes = serviceRequestData?.notes ? `\n\nNotes: ${serviceRequestData.notes}` : '';
    
    for (const item of items) {
      try {
        const problemDescription = `${item.equipmentName}${additionalNotes}`;
        
        const result = await sql`
          insert into service_request (
            id, created_at, created_by,
            equipment_id, assigned_technician_id, assigned_technician_ids, request_type, scheduled_at,
            priority, approval_status, work_status,
            problem_description, ticket_id
          ) values (
            gen_random_uuid(), now(), ${actorId},
            ${item.equipmentId}, ${assignedTechnicianId}, ${assignedTechnicianIdsJson}::jsonb, ${requestType}, ${scheduledAt},
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
      }
    }
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

export const createJobOrderForCsvImport = async (
  actorId: string,
  items: Array<{
    serviceRequestId: string;
    ticketId: string;
    equipmentId: string;
    equipmentName?: string;
    tagNumber?: string;
  }>,
): Promise<DbJobOrder> => {
  if (!items || items.length === 0) {
    throw new Error('No items provided for CSV import job order');
  }

  const sql = getDb();

  const first = items[0];
  const equipment = await getEquipmentWithLocationInfo(first.equipmentId);

  const campus: string =
    (equipment && (equipment as { campus?: string }).campus) ||
    (equipment && (equipment as { location?: string }).location) ||
    'Unknown';

  const sublocation: string =
    (equipment && (equipment as { location_name?: string }).location_name) ||
    (equipment && (equipment as { sub_location?: string }).sub_location) ||
    '';

  const orderNumber = await generateOrderNumber(first.ticketId);

  const payload = items.map((item) => ({
    source: 'csv_import',
    serviceRequestId: item.serviceRequestId,
    ticketNumber: item.ticketId,
    equipmentId: item.equipmentId,
    equipmentName: item.equipmentName ?? null,
    partNumber: item.tagNumber ?? null,
  }));

  const [row] = await sql`
    insert into job_orders (
      created_at, created_by,
      order_number, campus, sublocation, items, status
    ) values (
      now(), ${actorId},
      ${orderNumber}, ${campus}, ${sublocation}, ${JSON.stringify(payload)}::jsonb, 'submitted'
    ) returning *
  `;

  return row as unknown as DbJobOrder;
};
