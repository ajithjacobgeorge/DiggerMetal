export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function sendPricePushNotification(params: {
  title: string;
  body: string;
  tag?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body: params.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: params.tag ?? 'aurumpulse-alert',
    requireInteraction: false,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(params.title, options);
        return true;
      }
    }
    new Notification(params.title, options);
    return true;
  } catch {
    return false;
  }
}
