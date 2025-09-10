import { NextRequest } from 'next/server';
import { stackServerApp } from '../stack';
import type { CurrentServerUser } from '@stackframe/stack';
import type { UserRole } from './types/user';

export async function getCurrentServerUser(req: NextRequest) {
  return stackServerApp.getUser({ tokenStore: req });
}

export function getUserRole(user: CurrentServerUser | null): UserRole | null {
  if (!user) return null;
  const role = (user.serverMetadata?.role ?? user.clientReadOnlyMetadata?.role) as string | undefined;
  if (role === 'admin' || role === 'supervisor' || role === 'user') return role;
  return null;
}

export function ensureRole(user: CurrentServerUser | null, allowedRoles: ReadonlyArray<UserRole>) {
  const role = getUserRole(user);
  if (!role || !allowedRoles.includes(role)) {
    const error = new Error('Forbidden');
    // @ts-expect-error attach status for API handlers to pick up
    error.status = 403;
    throw error;
  }
}

