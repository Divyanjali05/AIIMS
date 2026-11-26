/**
 * Application-wide configuration and public constants.
 */

export const SUPPORT_EMAIL: string =
  (import.meta as any).env?.VITE_SUPPORT_EMAIL ||
  (import.meta as any).env?.SUPPORT_EMAIL ||
  'support@aiims.education';

/**
 * Global feature flag: locks Entrepreneur mode across the AIIMS application when false.
 * Defaults to false (locked). Easily reversible by setting VITE_ENTREPRENEUR_MODE_ENABLED=true.
 */
export const ENTREPRENEUR_MODE_ENABLED: boolean =
  (import.meta as any).env?.VITE_ENTREPRENEUR_MODE_ENABLED === 'true' || false;

/**
 * AI Wallet Unlock Requirement: Minimum question attempts completed across Clarity and Focus.
 * Configurable threshold (easily adjustable to 2 in future if required).
 */
export const MIN_COMPLETED_QUESTIONS_FOR_WALLET: number = 3;
