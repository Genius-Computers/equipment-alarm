export type UserRole = "admin" | "admin_x" | "supervisor" | "technician" | "end_user";

export const APPROVER_ROLES: ReadonlyArray<UserRole> = ["admin", "admin_x", "supervisor"] as const;

export const isApproverRole = (role: string | null | undefined): role is UserRole => {
  return role === "admin" || role === "admin_x" || role === "supervisor";
};

export const canApprove = (role: string | null | undefined): boolean => isApproverRole(role);

export const canManageUsers = (role: string | null | undefined): boolean => role === "admin" || role === "admin_x" || role === "supervisor";

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