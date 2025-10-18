// Database connection and schema
export { getDb } from './connection';
export { ensureSchema } from './schema';

// Equipment operations
export {
  listEquipmentPaginated,
  insertEquipment,
  updateEquipment,
  softDeleteEquipment,
  bulkSoftDeleteEquipment,
  bulkInsertEquipment,
  getEquipmentById,
  getUniqueSubLocationsByLocation,
  getEquipmentWithLocationInfo,
} from './equipment';

// Service request operations
export {
  listServiceRequestPaginated,
  getServiceRequestById,
  getNextTicketId,
  insertServiceRequest,
  updateServiceRequest,
  getServiceRequestsBySparePartId,
} from './service-requests';

// Spare parts operations
export {
  listSparePartsPaginated,
  insertSparePart,
  updateSparePart,
  softDeleteSparePart,
  findOrCreateSparePart,
  createSparePartOrder,
  updateSparePartOrder,
  listSparePartOrders,
  getSparePartOrderById,
  softDeleteSparePartOrder,
  addSparePartOrderToInventory,
} from './spare-parts';

// Locations operations
export {
  validateLocationExists,
  listLocationsByCampus,
  findOrCreateLocation,
  insertLocation,
  softDeleteLocation,
  deleteAllLocations,
  listAllLocations,
  getLocationById,
} from './locations';

// Attendance operations
export {
  logInAttendance,
  logOutAttendance,
  getTodayAttendance,
  getAttendanceForDate,
} from './attendance';

// Job orders operations
export {
  createJobOrder,
  getJobOrderById,
  submitJobOrder,
  listJobOrdersPaginated,
} from './job-orders';

// Migration utilities
export {
  migrateEquipmentToNewLocationStructure,
} from './migrations';