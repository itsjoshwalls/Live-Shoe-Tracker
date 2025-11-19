/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let googleProvider: GoogleAuthProvider;

// Determine active environment (defaults to production)
const environment = process.env.NEXT_PUBLIC_FIREBASE_ENV || 'production';

/**
 * Initialize Firebase client SDK with environment-aware config
 * Supports 'production' and 'staging' environments
 */
function initializeFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Select config based on environment
  const configJson = environment === 'staging'
    ? process.env.NEXT_PUBLIC_FIREBASE_STAGING_CONFIG
    : process.env.NEXT_PUBLIC_FIREBASE_CONFIG; // production (default)
  
  if (!configJson) {
    console.error(`❌ Firebase config not set for environment: ${environment}`);
    throw new Error(`Missing Firebase configuration for ${environment}`);
  }

  try {
    const firebaseConfig = JSON.parse(configJson);
    app = initializeApp(firebaseConfig);
    console.log(`🔥 Firebase initialized: ${firebaseConfig.projectId} (${environment})`);
    return app;
  } catch (error) {
    console.error('❌ Failed to parse Firebase config:', error);
    throw error;
  }
}

/**
 * Get Firebase Auth instance
 */
export function getAuthInstance(): Auth {
  if (!auth) {
    const app = initializeFirebase();
    auth = getAuth(app);
  }
  return auth;
}

/**
 * Get Firestore instance
 */
export function getFirestoreInstance(): Firestore {
  if (!db) {
    const app = initializeFirebase();
    db = getFirestore(app);
  }
  return db;
}

/**
 * Get Firebase Functions instance
 */
export function getFunctionsInstance(): Functions {
  if (!functions) {
    const app = initializeFirebase();
    functions = getFunctions(app, 'us-central1'); // Match your deployed region
  }
  return functions;
}

/**
 * Get Google Auth Provider
 */
export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
  }
  return googleProvider;
}

// Export singleton instances for convenience
export { auth, db, functions };
