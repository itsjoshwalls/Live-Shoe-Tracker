/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Determine which project to use based on environment or feature flag
const environment = process.env.NEXT_PUBLIC_ENV || 'production'; // 'production' | 'staging' | 'development'

const configs = {
  production: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_PROD_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_PROD_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROD_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_PROD_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_PROD_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_PROD_APP_ID,
  },
  staging: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_STAGING_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_STAGING_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_STAGING_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STAGING_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_STAGING_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_STAGING_APP_ID,
  },
  development: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_DEV_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_DEV_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_DEV_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_DEV_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_DEV_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_DEV_APP_ID,
  },
};

const activeConfig = configs[environment as keyof typeof configs] || configs.production;

const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
export const db = getFirestore(app);
export const firebaseApp = app;

console.log(`🔥 Firebase connected to: ${activeConfig.projectId}`);
