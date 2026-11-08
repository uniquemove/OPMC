import { Capacitor } from '@capacitor/core';

/**
 * Checks if the user is running inside the native Android App (Capacitor / WebView / Standalone)
 * Returns TRUE if running in Android app -> DO NOT show "Tải App"
 * Returns FALSE if running on standard Web browser -> SHOW "Tải App"
 */
export const isNativeApp = (): boolean => {
  try {
    // 1. Capacitor Native Platform check
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    // 2. Standalone PWA / TWA check
    if (typeof window !== 'undefined') {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
      if ((window.navigator as any).standalone === true) {
        return true;
      }

      // 3. Android WebView detection
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('wv') || (ua.includes('android') && ua.includes('version/'))) {
        return true;
      }
    }
  } catch {
    // Fallback
  }

  return false;
};
