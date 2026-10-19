/**
 * AIIMS Focus Notification Service (Phase 6C)
 * 
 * Manages optional desktop notifications for focus and break transitions.
 * Fully graceful: respects browser permissions, remains fully usable when denied,
 * and safely no-ops on environments where Notifications API is unsupported.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestFocusNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (e) {
    return false;
  }
}

export function sendFocusNotification(title: string, body: string): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'aiims-focus-notification'
    });

    // Auto-dismiss after 6 seconds to avoid notification clutter
    setTimeout(() => {
      try {
        notif.close();
      } catch (e) {}
    }, 6000);
  } catch (e) {
    // Silently continue if notification fails
  }
}
