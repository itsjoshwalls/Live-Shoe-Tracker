// Utility: Google Analytics 4 event tracker
export const trackGA4Event = (eventName: string, params?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId || !window.gtag) {
    console.log(`[GA4 ${eventName}]`, params); // Dev logging
    return;
  }
  
  window.gtag('event', eventName, params);
};

// Utility: localStorage persistence with error handling
export const storage = {
  get: <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`localStorage.get(${key}) failed:`, e);
      return fallback;
    }
  },
  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`localStorage.set(${key}) failed:`, e);
    }
  },
};

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
