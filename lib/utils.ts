import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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