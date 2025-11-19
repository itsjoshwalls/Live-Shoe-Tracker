/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Primary project (production data)
const primaryConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Secondary project (e.g., analytics, logging, or dev environment)
const secondaryConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_SECONDARY_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_SECONDARY_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_SECONDARY_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_SECONDARY_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SECONDARY_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_SECONDARY_APP_ID,
};

// Initialize apps with unique names
const primaryApp: FirebaseApp = getApps().find(app => app.name === 'primary')
  ? getApp('primary')
  : initializeApp(primaryConfig, 'primary');

const secondaryApp: FirebaseApp = getApps().find(app => app.name === 'secondary')
  ? getApp('secondary')
  : initializeApp(secondaryConfig, 'secondary');

// Export Firestore instances
export const primaryFirestore: Firestore = getFirestore(primaryApp);
export const secondaryFirestore: Firestore = getFirestore(secondaryApp);

// Export Auth instances (shared or separate depending on use case)
export const primaryAuth: Auth = getAuth(primaryApp);
export const secondaryAuth: Auth = getAuth(secondaryApp);

// Export apps for advanced usage
export { primaryApp, secondaryApp };
