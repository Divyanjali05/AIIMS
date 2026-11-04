import { Capacitor } from '@capacitor/core';

export type DevicePlatform = 'web' | 'android' | 'ios' | 'other';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: DevicePlatform;
}

const STORAGE_KEY = 'aiims_device_id';

/**
 * Generates a cryptographically strong UUID v4 using Web Crypto API.
 */
function generateCryptoUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Detects friendly browser & operating system descriptor for web.
 */
function getWebDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Web Client';
  const ua = navigator.userAgent;

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
}

/**
 * Gets or initializes the persistent device enrollment identifier.
 * Persists in localStorage across browser sessions and normal restarts.
 */
export function getPersistentDeviceId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'server-render-device';
  }

  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId || !deviceId.trim()) {
    deviceId = generateCryptoUUID();
    try {
      localStorage.setItem(STORAGE_KEY, deviceId);
    } catch (e) {
      console.warn('Failed to persist deviceId in localStorage:', e);
    }
  }
  return deviceId;
}

/**
 * Authoritative device information for request headers and authentication payloads.
 */
export function getDeviceInfo(): DeviceInfo {
  const isNative = Capacitor.isNativePlatform();
  const capPlatform = Capacitor.getPlatform();

  const deviceId = getPersistentDeviceId();

  if (isNative && capPlatform === 'android') {
    return {
      deviceId,
      deviceName: 'Android Device (Capacitor)',
      platform: 'android',
    };
  }

  if (isNative && capPlatform === 'ios') {
    return {
      deviceId,
      deviceName: 'iOS Device (Capacitor)',
      platform: 'ios',
    };
  }

  return {
    deviceId,
    deviceName: getWebDeviceName(),
    platform: 'web',
  };
}

/**
 * Headers to attach to authenticated requests for One Account, One Device enforcement.
 */
export function getDeviceHeaders(): Record<string, string> {
  const info = getDeviceInfo();
  return {
    'X-Device-Id': info.deviceId,
    'X-Device-Name': info.deviceName,
    'X-Platform': info.platform,
  };
}
