import crypto from 'crypto';
import { Request } from 'express';

export type DevicePlatform = 'web' | 'android' | 'ios' | 'other';

export interface DeviceInfo {
  deviceId: string;
  deviceIdHash: string;
  deviceName: string;
  platform: DevicePlatform;
}

/**
 * Computes a deterministic SHA-256 hash of the device identifier.
 * Plaintext hardware IDs or persistent browser UUIDs are never stored in the database.
 */
export function hashDeviceId(deviceId: string): string {
  if (!deviceId || typeof deviceId !== 'string') {
    throw new Error('Device identifier must be a non-empty string');
  }
  const clean = deviceId.trim();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Extracts and normalizes device identification information from incoming request headers or body.
 */
export function extractDeviceInfo(req: Request): DeviceInfo {
  // 1. Device ID from header or body
  const rawDeviceId =
    (req.headers['x-device-id'] as string) || req.body?.deviceId || req.body?.device_id || '';

  // 2. Device Name
  const rawDeviceName =
    (req.headers['x-device-name'] as string) || req.body?.deviceName || req.body?.device_name || '';

  // 3. Platform
  const rawPlatform =
    (req.headers['x-platform'] as string) ||
    (req.headers['x-client'] as string) ||
    req.body?.platform ||
    '';

  let platform: DevicePlatform = 'web';
  const cleanPlatform = String(rawPlatform).toLowerCase().trim();
  if (cleanPlatform === 'android' || cleanPlatform === 'mobile') {
    platform = 'android';
  } else if (cleanPlatform === 'ios') {
    platform = 'ios';
  } else if (cleanPlatform === 'web') {
    platform = 'web';
  } else {
    // Detect from user-agent
    const ua = (req.headers['user-agent'] as string) || '';
    if (/android/i.test(ua)) {
      platform = 'android';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      platform = 'ios';
    } else {
      platform = 'web';
    }
  }

  // Fallback device ID if none provided by client (e.g., standard browser visit before enrollment)
  // Derive a reproducible fallback or generate a unique random ID
  let deviceId = typeof rawDeviceId === 'string' ? rawDeviceId.trim() : '';
  if (!deviceId) {
    // If no client device ID provided, generate an ephemeral fallback identifier
    deviceId = `dev_fallback_${crypto.randomBytes(16).toString('hex')}`;
  }

  let deviceName = typeof rawDeviceName === 'string' ? rawDeviceName.trim() : '';
  if (!deviceName) {
    const ua = (req.headers['user-agent'] as string) || '';
    if (platform === 'android') {
      deviceName = 'Android Device';
    } else if (platform === 'ios') {
      deviceName = 'iOS Device';
    } else if (/chrome/i.test(ua)) {
      deviceName = 'Chrome Browser';
    } else if (/firefox/i.test(ua)) {
      deviceName = 'Firefox Browser';
    } else if (/safari/i.test(ua)) {
      deviceName = 'Safari Browser';
    } else {
      deviceName = 'Web Client';
    }
  }

  return {
    deviceId,
    deviceIdHash: hashDeviceId(deviceId),
    deviceName,
    platform,
  };
}
