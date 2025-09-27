export type UserRole = "admin" | "supervisor" | "user";

export const APPROVER_ROLES: ReadonlyArray<UserRole> = ["admin", "supervisor"] as const;

export const isApproverRole = (role: string | null | undefined): role is UserRole => {
  return role === "admin" || role === "supervisor";
};

export const canApprove = (role: string | null | undefined): boolean => isApproverRole(role);

export const canCreateUsers = (role: string | null | undefined): boolean => role === "admin";

export interface User {
  id: string;
  displayName?: string
  email?: string
  role?: UserRole; 
  signedUpAt?: string
}