/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Map of region/tenant to Firebase project configs
const projectConfigs: Record<string, any> = {
  'us-east': {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_US_EAST_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_US_EAST_PROJECT_ID,
    // ... other config
  },
  'eu-west': {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_EU_WEST_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_EU_WEST_PROJECT_ID,
    // ... other config
  },
  'apac': {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_APAC_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_APAC_PROJECT_ID,
    // ... other config
  },
};

// Cache of initialized apps
const appCache = new Map<string, FirebaseApp>();

/**
 * Get or initialize a Firebase app for a specific region/tenant
 */
export function getFirebaseAppForRegion(region: string): FirebaseApp {
  if (appCache.has(region)) {
    return appCache.get(region)!;
  }

  const config = projectConfigs[region];
  if (!config) {
    throw new Error(`No Firebase config found for region: ${region}`);
  }

  const appName = `firebase-${region}`;
  const existingApp = getApps().find(app => app.name === appName);
  
  const app = existingApp || initializeApp(config, appName);
  appCache.set(region, app);
  
  return app;
}

/**
 * Get Firestore instance for a specific region
 */
export function getFirestoreForRegion(region: string): Firestore {
  const app = getFirebaseAppForRegion(region);
  return getFirestore(app);
}

// Example usage hook for React
export function useRegionalFirestore(userRegion: string) {
  return getFirestoreForRegion(userRegion);
}
