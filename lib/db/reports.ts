import { getDb } from './connection';
import { 
  MonthlyReport, 
  EquipmentStats, 
  ServiceRequestStats, 
  JobOrderStats, 
  SparePartsStats, 
  SparePartOrderStats, 
  AttendanceStats,
  ReportFilters 
} from '../types/report';
import { ServiceRequestType, ServiceRequestPriority, ServiceRequestApprovalStatus, ServiceRequestWorkStatus, SparePartNeeded } from '../types/service-request';
import { SparePartOrderStatus, SparePartOrderItem } from '../types/spare-part-order';
import { JobOrderItem } from '../types/job-order';

// Database row types
interface DbRow {
  [key: string]: unknown;
}

export const generateMonthlyReport = async (filters: ReportFilters): Promise<MonthlyReport> => {
  const [equipmentStats, serviceRequestStats, jobOrderStats, sparePartsStats, sparePartOrderStats, attendanceStats] = await Promise.all([
    getEquipmentStats(filters),
    getServiceRequestStats(filters),
    getJobOrderStats(filters),
    getSparePartsStats(filters),
    getSparePartOrderStats(filters),
    getAttendanceStats(filters)
  ]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return {
    period: {
      month: filters.month,
      year: filters.year,
      monthName: monthNames[filters.month - 1]
    },
    generatedAt: new Date().toISOString(),
    generatedBy: 'System', // TODO: Get from auth context
    equipment: equipmentStats,
    serviceRequests: serviceRequestStats,
    jobOrders: jobOrderStats,
    spareParts: sparePartsStats,
    sparePartOrders: sparePartOrderStats,
    attendance: attendanceStats,
    summary: {
      totalEquipment: equipmentStats.total, // Total equipment count (reference only)
      totalServiceRequests: serviceRequestStats.total, // Service requests this month
      totalJobOrders: jobOrderStats.total, // Job orders this month
      totalSparePartsCost: serviceRequestStats.totalSparePartsCost + sparePartOrderStats.totalCost, // Parts cost this month
      totalTechnicians: attendanceStats.totalTechnicians // Active technicians this month
    }
  };
};

export const getEquipmentStats = async (filters: ReportFilters): Promise<EquipmentStats> => {
  const sql = getDb();
  
  const startDate = new Date(filters.year, filters.month - 1, 1);
  const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
  
  // Base query for equipment with location filtering
  
  // Get total equipment count
  const [totalResult] = await sql`
    SELECT COUNT(*) as total
    FROM equipment e
    WHERE e.deleted_at IS NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
  `;
  
  // Get equipment by status
  const statusResults = await sql`
    SELECT status, COUNT(*) as count
    FROM equipment e
    WHERE e.deleted_at IS NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY status
  `;
  
  // Get equipment by manufacturer
  const manufacturerResults = await sql`
    SELECT manufacturer, COUNT(*) as count
    FROM equipment e
    WHERE e.deleted_at IS NULL
    AND manufacturer IS NOT NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY manufacturer
  `;
  
  // Get equipment by sublocation
  const sublocationResults = await sql`
    SELECT sub_location, COUNT(*) as count
    FROM equipment e
    WHERE e.deleted_at IS NULL
    AND sub_location IS NOT NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY sub_location
  `;
  
  // Get new equipment added this month
  const [newThisMonthResult] = await sql`
    SELECT COUNT(*) as count
    FROM equipment e
    WHERE e.deleted_at IS NULL
    AND e.created_at >= ${startDate.toISOString()}
    AND e.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
  `;
  
  // Get all equipment for detailed view
  const equipmentResults = await sql`
    SELECT e.*, l.campus, l.name as location_name
    FROM equipment e
    LEFT JOIN locations l ON e.location_id = l.id
    WHERE e.deleted_at IS NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    ORDER BY e.name
  `;
  
  // Calculate maintenance due/overdue (simplified logic)
  const maintenanceResults = await sql`
    SELECT 
      COUNT(CASE WHEN last_maintenance IS NULL THEN 1 END) as due,
      COUNT(CASE WHEN last_maintenance IS NOT NULL AND 
        (CURRENT_DATE - last_maintenance::date) > 365 THEN 1 END) as overdue
    FROM equipment e
    WHERE e.deleted_at IS NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
  `;
  
  const byStatus: Record<string, number> = {};
  statusResults.forEach((row: DbRow) => {
    byStatus[row.status as string] = parseInt(row.count as string);
  });
  
  const byManufacturer: Record<string, number> = {};
  manufacturerResults.forEach((row: DbRow) => {
    byManufacturer[row.manufacturer as string] = parseInt(row.count as string);
  });
  
  const bySublocation: Record<string, number> = {};
  sublocationResults.forEach((row: DbRow) => {
    bySublocation[row.sub_location as string] = parseInt(row.count as string);
  });
  
  return {
    total: parseInt(totalResult.total),
    byStatus,
    byManufacturer,
    bySublocation,
    maintenanceDue: parseInt(maintenanceResults[0]?.due || '0'),
    maintenanceOverdue: parseInt(maintenanceResults[0]?.overdue || '0'),
    newThisMonth: parseInt(newThisMonthResult.count),
    equipment: equipmentResults.map((row: DbRow) => ({
      id: row.id as string,
      name: row.name as string,
      partNumber: row.part_number as string,
      model: row.model as string,
      manufacturer: row.manufacturer as string,
      serialNumber: row.serial_number as string,
      location: row.location as string,
      subLocation: row.sub_location as string,
      locationId: row.location_id as string,
      locationName: row.location_name as string,
      campus: row.campus as string,
      status: row.status as string,
      lastMaintenance: row.last_maintenance as string,
      maintenanceInterval: row.maintenance_interval as string
    }))
  };
};

export const getServiceRequestStats = async (filters: ReportFilters): Promise<ServiceRequestStats> => {
  const sql = getDb();
  
  const startDate = new Date(filters.year, filters.month - 1, 1);
  const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
  
  // Get total service requests for the month
  const [totalResult] = await sql`
    SELECT COUNT(*) as total
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
  `;
  
  // Get breakdown by type
  const typeResults = await sql`
    SELECT request_type, COUNT(*) as count
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY request_type
  `;
  
  // Get breakdown by priority
  const priorityResults = await sql`
    SELECT priority, COUNT(*) as count
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY priority
  `;
  
  // Get breakdown by approval status
  const approvalResults = await sql`
    SELECT approval_status, COUNT(*) as count
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY approval_status
  `;
  
  // Get breakdown by work status
  const workResults = await sql`
    SELECT work_status, COUNT(*) as count
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY work_status
  `;
  
  // Get service requests by equipment
  const equipmentResults = await sql`
    SELECT e.name as equipment_name, COUNT(*) as count
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY e.name
    ORDER BY count DESC
  `;
  
  // Get service requests by technician
  const technicianResults = await sql`
    SELECT assigned_technician_id, COUNT(*) as count
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    AND assigned_technician_id IS NOT NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY assigned_technician_id
  `;
  
  // Calculate average completion time (simplified)
  const [avgCompletionResult] = await sql`
    SELECT AVG(EXTRACT(EPOCH FROM (sr.updated_at - sr.created_at))/3600) as avg_hours
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.work_status = 'completed'
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
  `;
  
  // Calculate total spare parts cost
  const [sparePartsCostResult] = await sql`
    SELECT COALESCE(SUM(
      CASE 
        WHEN spare_parts_needed IS NOT NULL 
        THEN (
          SELECT SUM((item->>'cost')::numeric * (item->>'quantity')::numeric)
          FROM jsonb_array_elements(spare_parts_needed) as item
        )
        ELSE 0
      END
    ), 0) as total_cost
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
  `;
  
  // Get all service requests for detailed view
  const serviceRequestResults = await sql`
    SELECT sr.*, e.name as equipment_name
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    ORDER BY sr.created_at DESC
  `;
  
  const byType: Record<ServiceRequestType, number> = {} as Record<ServiceRequestType, number>;
  typeResults.forEach((row: DbRow) => {
    byType[row.request_type as ServiceRequestType] = parseInt(row.count as string);
  });
  
  const byPriority: Record<ServiceRequestPriority, number> = {} as Record<ServiceRequestPriority, number>;
  priorityResults.forEach((row: DbRow) => {
    byPriority[row.priority as ServiceRequestPriority] = parseInt(row.count as string);
  });
  
  const byApprovalStatus: Record<ServiceRequestApprovalStatus, number> = {} as Record<ServiceRequestApprovalStatus, number>;
  approvalResults.forEach((row: DbRow) => {
    byApprovalStatus[row.approval_status as ServiceRequestApprovalStatus] = parseInt(row.count as string);
  });
  
  const byWorkStatus: Record<ServiceRequestWorkStatus, number> = {} as Record<ServiceRequestWorkStatus, number>;
  workResults.forEach((row: DbRow) => {
    byWorkStatus[row.work_status as ServiceRequestWorkStatus] = parseInt(row.count as string);
  });
  
  const byEquipment: Record<string, number> = {};
  equipmentResults.forEach((row: DbRow) => {
    byEquipment[row.equipment_name as string] = parseInt(row.count as string);
  });
  
  const byTechnician: Record<string, number> = {};
  technicianResults.forEach((row: DbRow) => {
    byTechnician[row.assigned_technician_id as string] = parseInt(row.count as string);
  });
  
  return {
    total: parseInt(totalResult.total),
    byType,
    byPriority,
    byApprovalStatus,
    byWorkStatus,
    averageCompletionTime: parseFloat(avgCompletionResult?.avg_hours || '0'),
    byEquipment,
    byTechnician,
    totalSparePartsCost: parseFloat(sparePartsCostResult?.total_cost || '0'),
    serviceRequests: serviceRequestResults.map((row: DbRow) => ({
      id: row.id as string,
      ticketId: row.ticket_id as string,
      equipmentId: row.equipment_id as string,
      assignedTechnicianId: row.assigned_technician_id as string,
      requestType: row.request_type as ServiceRequestType,
      scheduledAt: row.scheduled_at as string,
      priority: row.priority as ServiceRequestPriority,
      approvalStatus: row.approval_status as ServiceRequestApprovalStatus,
      workStatus: row.work_status as ServiceRequestWorkStatus,
      problemDescription: row.problem_description as string,
      technicalAssessment: row.technical_assessment as string,
      recommendation: row.recommendation as string,
      sparePartsNeeded: row.spare_parts_needed as SparePartNeeded[] | undefined,
      approvalNote: row.approval_note as string
    }))
  };
};

export const getJobOrderStats = async (filters: ReportFilters): Promise<JobOrderStats> => {
  const sql = getDb();
  
  const startDate = new Date(filters.year, filters.month - 1, 1);
  const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
  
  // Get total job orders for the month
  const [totalResult] = await sql`
    SELECT COUNT(*) as total
    FROM job_orders jo
    WHERE jo.deleted_at IS NULL
    AND jo.created_at >= ${startDate.toISOString()}
    AND jo.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND jo.campus = (SELECT campus FROM locations WHERE id = ${filters.locationId})` : sql``}
  `;
  
  // Get breakdown by status
  const statusResults = await sql`
    SELECT status, COUNT(*) as count
    FROM job_orders jo
    WHERE jo.deleted_at IS NULL
    AND jo.created_at >= ${startDate.toISOString()}
    AND jo.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND jo.campus = (SELECT campus FROM locations WHERE id = ${filters.locationId})` : sql``}
    GROUP BY status
  `;
  
  // Get breakdown by sublocation
  const sublocationResults = await sql`
    SELECT sublocation, COUNT(*) as count
    FROM job_orders jo
    WHERE jo.deleted_at IS NULL
    AND jo.created_at >= ${startDate.toISOString()}
    AND jo.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND jo.campus = (SELECT campus FROM locations WHERE id = ${filters.locationId})` : sql``}
    GROUP BY sublocation
  `;
  
  // Get total equipment items
  const [equipmentItemsResult] = await sql`
    SELECT SUM(jsonb_array_length(items)) as total_items
    FROM job_orders jo
    WHERE jo.deleted_at IS NULL
    AND jo.created_at >= ${startDate.toISOString()}
    AND jo.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND jo.campus = (SELECT campus FROM locations WHERE id = ${filters.locationId})` : sql``}
  `;
  
  // Get most active sublocations
  const mostActiveResults = await sql`
    SELECT sublocation, COUNT(*) as count
    FROM job_orders jo
    WHERE jo.deleted_at IS NULL
    AND jo.created_at >= ${startDate.toISOString()}
    AND jo.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND jo.campus = (SELECT campus FROM locations WHERE id = ${filters.locationId})` : sql``}
    GROUP BY sublocation
    ORDER BY count DESC
    LIMIT 10
  `;
  
  // Get all job orders for detailed view
  const jobOrderResults = await sql`
    SELECT *
    FROM job_orders jo
    WHERE jo.deleted_at IS NULL
    AND jo.created_at >= ${startDate.toISOString()}
    AND jo.created_at <= ${endDate.toISOString()}
    ${filters.locationId ? sql`AND jo.campus = (SELECT campus FROM locations WHERE id = ${filters.locationId})` : sql``}
    ORDER BY jo.created_at DESC
  `;
  
  const byStatus: Record<string, number> = {};
  statusResults.forEach((row: DbRow) => {
    byStatus[row.status as string] = parseInt(row.count as string);
  });
  
  const bySublocation: Record<string, number> = {};
  sublocationResults.forEach((row: DbRow) => {
    bySublocation[row.sublocation as string] = parseInt(row.count as string);
  });
  
  return {
    total: parseInt(totalResult.total),
    byStatus,
    bySublocation,
    totalEquipmentItems: parseInt(equipmentItemsResult?.total_items || '0'),
    mostActiveSublocations: mostActiveResults.map((row: DbRow) => ({
      sublocation: row.sublocation as string,
      count: parseInt(row.count as string)
    })),
    jobOrders: jobOrderResults.map((row: DbRow) => ({
      id: row.id as string,
      orderNumber: row.order_number as string,
      campus: row.campus as string,
      sublocation: row.sublocation as string,
      items: row.items as JobOrderItem[],
      status: row.status as "submitted" | "in_progress" | "completed" | "cancelled",
      submittedBy: row.submitted_by as string,
      submittedAt: row.submitted_at as string,
      createdAt: row.created_at as string
    }))
  };
};

export const getSparePartsStats = async (filters: ReportFilters): Promise<SparePartsStats> => {
  const sql = getDb();
  
  const startDate = new Date(filters.year, filters.month - 1, 1);
  const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
  
  // Get current inventory stats
  const [inventoryResult] = await sql`
    SELECT 
      COUNT(*) as total_items,
      SUM(quantity) as total_quantity,
      COUNT(CASE WHEN quantity < 10 THEN 1 END) as low_stock
    FROM spare_parts sp
    WHERE sp.deleted_at IS NULL
  `;
  
  // Get monthly usage from service requests
  const usageResults = await sql`
    SELECT 
      item->>'part' as part_name,
      SUM((item->>'quantity')::numeric) as total_quantity,
      SUM((item->>'cost')::numeric * (item->>'quantity')::numeric) as total_cost
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    CROSS JOIN jsonb_array_elements(sr.spare_parts_needed) as item
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    AND sr.spare_parts_needed IS NOT NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
    GROUP BY item->>'part'
    ORDER BY total_quantity DESC
    LIMIT 10
  `;
  
  // Get all spare parts
  const sparePartsResults = await sql`
    SELECT *
    FROM spare_parts sp
    WHERE sp.deleted_at IS NULL
    ORDER BY sp.name
  `;
  
  const [monthlyCostResult] = await sql`
    SELECT COALESCE(SUM((item->>'cost')::numeric * (item->>'quantity')::numeric), 0) as total_cost
    FROM service_request sr
    JOIN equipment e ON sr.equipment_id = e.id
    CROSS JOIN jsonb_array_elements(sr.spare_parts_needed) as item
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    AND sr.spare_parts_needed IS NOT NULL
    ${filters.locationId ? sql`AND (e.location_id = ${filters.locationId} OR e.location = (SELECT campus FROM locations WHERE id = ${filters.locationId}))` : sql``}
  `;
  
  return {
    totalItems: parseInt(inventoryResult?.total_items || '0'),
    lowStockAlerts: parseInt(inventoryResult?.low_stock || '0'),
    totalValue: 0, // Would need cost data in spare_parts table
    topRequested: usageResults.map((row: DbRow) => ({
      name: row.part_name as string,
      quantity: parseInt(row.total_quantity as string),
      cost: parseFloat(row.total_cost as string)
    })),
    monthlyUsage: usageResults.reduce((sum, row) => sum + parseInt(row.total_quantity as string), 0),
    monthlyCost: parseFloat(monthlyCostResult?.total_cost || '0'),
    spareParts: sparePartsResults.map((row: DbRow) => ({
      id: row.id as string,
      name: row.name as string,
      serialNumber: row.serial_number as string,
      quantity: row.quantity as number,
      manufacturer: row.manufacturer as string,
      supplier: row.supplier as string
    }))
  };
};

export const getSparePartOrderStats = async (filters: ReportFilters): Promise<SparePartOrderStats> => {
  const sql = getDb();
  
  const startDate = new Date(filters.year, filters.month - 1, 1);
  const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
  
  // Get total orders for the month
  const [totalResult] = await sql`
    SELECT COUNT(*) as total
    FROM spare_part_orders spo
    WHERE spo.deleted_at IS NULL
    AND spo.created_at >= ${startDate.toISOString()}
    AND spo.created_at <= ${endDate.toISOString()}
  `;
  
  // Get breakdown by status
  const statusResults = await sql`
    SELECT status, COUNT(*) as count
    FROM spare_part_orders spo
    WHERE spo.deleted_at IS NULL
    AND spo.created_at >= ${startDate.toISOString()}
    AND spo.created_at <= ${endDate.toISOString()}
    GROUP BY status
  `;
  
  // Calculate quantities and costs
  const quantityResults = await sql`
    SELECT 
      SUM(
        (SELECT SUM((item->>'quantityRequested')::numeric)
         FROM jsonb_array_elements(items) as item)
      ) as total_requested,
      SUM(
        (SELECT SUM(COALESCE((item->>'quantitySupplied')::numeric, 0))
         FROM jsonb_array_elements(items) as item)
      ) as total_supplied,
      SUM(
        (SELECT SUM(COALESCE((item->>'cost')::numeric, 0) * COALESCE((item->>'quantitySupplied')::numeric, 0))
         FROM jsonb_array_elements(items) as item)
      ) as total_cost
    FROM spare_part_orders spo
    WHERE spo.deleted_at IS NULL
    AND spo.created_at >= ${startDate.toISOString()}
    AND spo.created_at <= ${endDate.toISOString()}
  `;
  
  // Calculate average processing time
  const [avgProcessingResult] = await sql`
    SELECT AVG(EXTRACT(EPOCH FROM (spo.completed_at - spo.created_at))/3600) as avg_hours
    FROM spare_part_orders spo
    WHERE spo.deleted_at IS NULL
    AND spo.completed_at IS NOT NULL
    AND spo.created_at >= ${startDate.toISOString()}
    AND spo.created_at <= ${endDate.toISOString()}
  `;
  
  // Get all orders for detailed view
  const orderResults = await sql`
    SELECT *
    FROM spare_part_orders spo
    WHERE spo.deleted_at IS NULL
    AND spo.created_at >= ${startDate.toISOString()}
    AND spo.created_at <= ${endDate.toISOString()}
    ORDER BY spo.created_at DESC
  `;
  
  const byStatus: Record<SparePartOrderStatus, number> = {} as Record<SparePartOrderStatus, number>;
  statusResults.forEach((row: DbRow) => {
    byStatus[row.status as SparePartOrderStatus] = parseInt(row.count as string);
  });
  
  return {
    total: parseInt(totalResult.total),
    byStatus,
    totalQuantityRequested: parseInt(quantityResults[0]?.total_requested || '0'),
    totalQuantitySupplied: parseInt(quantityResults[0]?.total_supplied || '0'),
    averageProcessingTime: parseFloat(avgProcessingResult?.avg_hours || '0'),
    totalCost: parseFloat(quantityResults[0]?.total_cost || '0'),
    sparePartOrders: orderResults.map((row: DbRow) => ({
      id: row.id as string,
      status: row.status as SparePartOrderStatus,
      items: row.items as SparePartOrderItem[],
      supervisorNotes: row.supervisor_notes as string,
      technicianNotes: row.technician_notes as string,
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      submittedToSupervisorAt: row.submitted_to_supervisor_at as string,
      completedAt: row.completed_at as string
    }))
  };
};

export const getAttendanceStats = async (filters: ReportFilters): Promise<AttendanceStats> => {
  const sql = getDb();
  
  const startDate = new Date(filters.year, filters.month - 1, 1);
  const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
  
  // Get attendance data for the month
  const attendanceResults = await sql`
    SELECT 
      user_id,
      COUNT(*) as working_days,
      AVG(EXTRACT(EPOCH FROM (log_out_time - log_in_time))/3600) as avg_hours
    FROM attendance a
    WHERE a.date >= ${startDate.toISOString().split('T')[0]}
    AND a.date <= ${endDate.toISOString().split('T')[0]}
    AND log_in_time IS NOT NULL
    GROUP BY user_id
  `;
  
  // Get service request assignments for technicians
  const technicianWorkResults = await sql`
    SELECT 
      assigned_technician_id,
      COUNT(*) as assigned,
      COUNT(CASE WHEN work_status = 'completed' THEN 1 END) as completed
    FROM service_request sr
    WHERE sr.deleted_at IS NULL
    AND sr.created_at >= ${startDate.toISOString()}
    AND sr.created_at <= ${endDate.toISOString()}
    AND assigned_technician_id IS NOT NULL
    GROUP BY assigned_technician_id
  `;
  
  // Calculate overall stats
  const totalWorkingDays = attendanceResults.reduce((sum, row) => sum + parseInt(row.working_days as string), 0);
  const totalTechnicians = attendanceResults.length;
  const averageHoursPerDay = totalWorkingDays > 0 ? 
    attendanceResults.reduce((sum, row) => sum + parseFloat(row.avg_hours as string || '0'), 0) / totalTechnicians : 0;
  
  // Combine attendance and work data
  const byTechnician = attendanceResults.map((attendance: DbRow) => {
    const workData = technicianWorkResults.find((work: DbRow) => 
      work.assigned_technician_id === attendance.user_id
    );
    
    const assigned = workData ? parseInt(workData.assigned as string) : 0;
    const completed = workData ? parseInt(workData.completed as string) : 0;
    const completionRate = assigned > 0 ? (completed / assigned) * 100 : 0;
    
    return {
      technician: {
        id: attendance.user_id as string,
        displayName: `Technician ${(attendance.user_id as string).slice(0, 8)}` // Simplified
      },
      workingDays: parseInt(attendance.working_days as string),
      averageHours: parseFloat(attendance.avg_hours as string || '0'),
      serviceRequestsAssigned: assigned,
      serviceRequestsCompleted: completed,
      completionRate
    };
  });
  
  return {
    totalTechnicians,
    totalWorkingDays,
    averageHoursPerDay,
    lateArrivals: 0, // Would need to define "late" threshold
    earlyDepartures: 0, // Would need to define "early" threshold
    byTechnician
  };
};

