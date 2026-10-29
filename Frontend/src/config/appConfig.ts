/**
 * Application-wide configuration and public constants.
 */

export const SUPPORT_EMAIL: string =
  (import.meta as any).env?.VITE_SUPPORT_EMAIL ||
  (import.meta as any).env?.SUPPORT_EMAIL ||
  'support@aiims.education';
