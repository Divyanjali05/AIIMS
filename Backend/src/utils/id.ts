/**
 * id.ts
 * =========================================================
 * Identifier validation, prototype-pollution guards, and DTO serialization helpers.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID_REGEX = /^[0-9a-f]{24}$/i;
const SAFE_SLUG_ID_REGEX = /^[a-zA-Z0-9_-]{3,128}$/;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Prevents prototype pollution when accessing or indexing object keys from untrusted input.
 */
export function isSafeKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && !FORBIDDEN_KEYS.has(key);
}

/**
 * Validates that an identifier is a safe, non-injection string ID.
 * Supports PostgreSQL UUIDs, migrated 24-hex ObjectIds, and safe slug IDs (e.g. "tool-chatgpt", "user-123").
 * Rejects operator objects ({ $ne: null }), prototype pollution keys, whitespace, or special SQL/JSON characters.
 */
export function isValidId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return false;
  if (FORBIDDEN_KEYS.has(trimmed)) return false;
  return (
    UUID_REGEX.test(trimmed) || OBJECT_ID_REGEX.test(trimmed) || SAFE_SLUG_ID_REGEX.test(trimmed)
  );
}

/**
 * Validates standard UUID format specifically when strict UUID check is desired.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

/**
 * Attaches backward-compatible `_id` alias matching `id` for API consumers / frontend components.
 */
export function withLegacyId<T extends { id: string }>(entity: T): T & { _id: string } {
  return {
    ...entity,
    _id: entity.id,
  };
}

/**
 * Safely converts an unknown JSON/Prisma JsonValue column to a mutable plain object record.
 */
export function toRecord(val: unknown): Record<string, any> {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, any>;
  }
  return {};
}

/**
 * Safely converts an unknown JSON/Prisma JsonValue column to an array.
 */
export function toArray<T = any>(val: unknown): T[] {
  if (Array.isArray(val)) {
    return val as T[];
  }
  return [];
}
