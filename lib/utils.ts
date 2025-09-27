import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { User } from "./types/user"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function snakeToCamelCase<T extends object>(obj: T): Record<string, unknown>{
  function toCamelCaseKey(key: string): string {
    return key.replace(/[_-]([a-zA-Z0-9])/g, (_match, chr: string) => chr.toUpperCase())
  }

  function convertValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(convertValue)
    }

    if (value && typeof value === 'object' && (value as object).constructor === Object) {
      const inputObject = value as Record<string, unknown>
      const result: Record<string, unknown> = {}
      for (const [originalKey, nestedValue] of Object.entries(inputObject)) {
        const camelKey = toCamelCaseKey(originalKey)
        result[camelKey] = convertValue(nestedValue)
      }
      return result
    }

    return value
  }

  return convertValue(obj) as Record<string, unknown>
}

export function camelToSnakeCase<T extends object>(obj: T): Record<string, unknown>{
  function toSnakeCaseKey(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/-/g, '_')
      .toLowerCase()
  }

  function convertValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(convertValue)
    }

    if (value && typeof value === 'object' && (value as object).constructor === Object) {
      const inputObject = value as Record<string, unknown>
      const result: Record<string, unknown> = {}
      for (const [originalKey, nestedValue] of Object.entries(inputObject)) {
        const snakeKey = toSnakeCaseKey(originalKey)
        result[snakeKey] = convertValue(nestedValue)
      }
      return result
    }

    return value
  }

  return convertValue(obj) as Record<string, unknown>
}

// SQL helpers
export function toJsonbParam(value: unknown): string | null {
  return value != null ? JSON.stringify(value) : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatStackUserLight(u: any): User | null {
  if (!u) return null
  const role = ((u.clientReadOnlyMetadata && (u.clientReadOnlyMetadata as Record<string, unknown>).role as string | undefined) ||
               (u.serverMetadata && (u.serverMetadata as Record<string, unknown>).role as string | undefined))
  return {
    id: u.id,
    displayName: u.displayName,
    email: u.primaryEmail,
    role,
    signedUpAt: u.signedUpAt?.toISOString?.(),
  } as User
}

// Maintenance derivation helpers
export const MAINTENANCE_INTERVAL_DAYS_MAP: Record<string, number> = {
  '1 week': 7,
  '2 weeks': 14,
  '1 month': 30,
  '3 months': 90,
  '6 months': 180,
  '1 year': 365,
}

export function deriveMaintenanceInfo(input: { lastMaintenance?: string; maintenanceInterval: string }): { status: 'good' | 'due' | 'overdue'; nextMaintenance: string; daysUntil: number } {
  const last = input.lastMaintenance ? new Date(input.lastMaintenance) : new Date()
  const next = new Date(last)
  const addDays = MAINTENANCE_INTERVAL_DAYS_MAP[input.maintenanceInterval] ?? 30
  next.setDate(last.getDate() + addDays)
  const today = new Date()
  const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const status: 'good' | 'due' | 'overdue' = diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due' : 'good'
  return { status, nextMaintenance: next.toISOString(), daysUntil: diffDays }
}