export type UserRole = "admin" | "admin_x" | "supervisor" | "technician" | "end_user";

export const APPROVER_ROLES: ReadonlyArray<UserRole> = ["admin_x", "supervisor"] as const;

export const isApproverRole = (role: string | null | undefined): role is UserRole => {
  return role === "admin_x" || role === "supervisor";
};

export const canApprove = (role: string | null | undefined): boolean => isApproverRole(role);

export const canManageUsers = (role: string | null | undefined): boolean => role === "admin" || role === "admin_x" || role === "supervisor";

/**
 * Access hierarchy (highest → lowest):
 * admin_x > supervisor > admin > technician > end_user
 */
export const roleRank = (role: string | null | undefined): number => {
  switch (role) {
    case "admin_x":
      return 4;
    case "supervisor":
      return 3;
    case "admin":
      return 2;
    case "technician":
      return 1;
    case "end_user":
      return 0;
    // Unassigned/unknown role is treated as lowest for hierarchy checks.
    default:
      return -1;
  }
};

/**
 * True if requester is strictly higher in the hierarchy than target.
 * (Equal rank is not allowed.)
 */
export const isHigherRoleThan = (
  requesterRole: string | null | undefined,
  targetRole: string | null | undefined
): boolean => roleRank(requesterRole) > roleRank(targetRole);

export const canDeleteUser = (
  requesterRole: string | null | undefined,
  targetRole: string | null | undefined
): boolean => canManageUsers(requesterRole) && isHigherRoleThan(requesterRole, targetRole);

export const canAssignSupervisorRole = (role: string | null | undefined): boolean => role === "admin_x" || role === "supervisor";

export const canAssignAdminXRole = (role: string | null | undefined): boolean => role === "admin_x";

export const canAssignRole = (requesterRole: string | null | undefined, targetRole: string | null | undefined): boolean => {
  // Only admin, admin_x and supervisors can manage users
  if (!canManageUsers(requesterRole)) return false;
  
  // Special restriction: only admin_x and supervisors can assign supervisor role
  if (targetRole === "supervisor" && !canAssignSupervisorRole(requesterRole)) {
    return false;
  }
  
  // Special restriction: only admin_x and supervisors can assign admin_x role
  if (targetRole === "admin_x" && !canAssignAdminXRole(requesterRole)) {
    return false;
  }
  
  return true;
};

export const isTechnicianRole = (role: string | null | undefined): boolean => role === "technician" || role === "admin";

export const canLogAttendance = (role: string | null | undefined): boolean => role === "technician" || role === "admin" || role === "admin_x";

export const showAttendancePopup = (role: string | null | undefined): boolean => role === "technician" || role === "admin";

export interface User {
  id: string;
  displayName?: string
  email?: string
  role?: UserRole; 
  signedUpAt?: string
  phone?: string
  designation?: string
  department?: string
  employeeId?: string
}