// Client-side Firebase initialization.
// Reads VITE_FIREBASE_CONFIG_JSON (stringified JSON) from import.meta.env
// and initializes the modular Firebase SDK (v9+). Exports Firestore helpers.
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  increment,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  getIdTokenResult,
  signInAnonymously,
} from "firebase/auth";

let db = null;
let auth = null;
let provider = null;

function init() {
  if (db) return db;
  const raw = import.meta.env.VITE_FIREBASE_CONFIG_JSON || "";
  if (!raw) {
    console.warn("VITE_FIREBASE_CONFIG_JSON is not set. Firestore will not be initialized.");
    return null;
  }
  try {
    const cfg = JSON.parse(raw);
    const app = initializeApp(cfg);
    db = getFirestore(app);
    // initialize auth as well for client sign-in flows
    try {
      auth = getAuth(app);
      provider = new GoogleAuthProvider();
    } catch (e) {
      console.warn("Failed to initialize Firebase Auth:", e);
    }
    return db;
  } catch (e) {
    console.error("Failed to parse VITE_FIREBASE_CONFIG_JSON:", e);
    return null;
  }
}

function collectionRef(name = "sneakers") {
  const database = init();
  if (!database) return null;
  return collection(database, name);
}

function listenCollection(name, onChange) {
  const ref = collectionRef(name);
  if (!ref) return () => {};
  const q = query(ref, orderBy("name"));
  const unsub = onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    onChange(items);
  });
  return unsub;
}

async function incrementMileage(collectionName, id, by = 1) {
  const database = init();
  if (!database) throw new Error("Firestore not initialized");
  const d = doc(database, collectionName, id);
  // Use Firestore's atomic increment so we don't need a read-modify-write.
  await updateDoc(d, { mileage: increment(by) });
}

async function updateMileage(collectionName, id, newMileage) {
  const database = init();
  if (!database) throw new Error("Firestore not initialized");
  const d = doc(database, collectionName, id);
  await updateDoc(d, { mileage: newMileage });
}

// Add shoe to user's private collection
async function addShoe(collectionName, shoe) {
  const database = init();
  if (!database) throw new Error("Firestore not initialized");
  const ref = collection(database, collectionName);
  await addDoc(ref, shoe);
}

// Remove shoe from user's private collection
async function removeShoe(collectionName, id) {
  const database = init();
  if (!database) throw new Error("Firestore not initialized");
  const d = doc(database, collectionName, id);
  await deleteDoc(d);
}

// Retire shoe (set retired=true)
async function retireShoe(collectionName, id) {
  const database = init();
  if (!database) throw new Error("Firestore not initialized");
  const d = doc(database, collectionName, id);
  await updateDoc(d, { retired: true });
}

// Send chat message
async function sendChatMessage(collectionName, msg) {
  const database = init();
  if (!database) throw new Error("Firestore not initialized");
  const ref = collection(database, collectionName);
  await addDoc(ref, msg);
}

// Anonymous sign-in
async function signInAnon() {
  init();
  if (!auth) throw new Error("Auth not initialized");
  const result = await signInAnonymously(auth);
  return result.user;
}

export {
  init,
  collectionRef,
  listenCollection,
  updateMileage,
  incrementMileage,
  addShoe,
  removeShoe,
  retireShoe,
  sendChatMessage,
  signInAnon,
};

// ----- Auth helpers -----
async function signInWithGoogle() {
  init();
  if (!auth || !provider) throw new Error("Auth not initialized");
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

async function signOut() {
  if (!auth) return;
  await fbSignOut(auth);
}

function onAuthChange(callback) {
  init();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

async function isUserAdmin(user) {
  if (!user) return false;
  try {
    const idTokenResult = await getIdTokenResult(user, /* forceRefresh= */ false);
    return Boolean(idTokenResult.claims && idTokenResult.claims.admin);
  } catch (e) {
    console.warn("Failed to get ID token claims:", e);
    return false;
  }
}

export { signInWithGoogle, signOut, onAuthChange, isUserAdmin };

// ----- Environment config helpers -----
// Returns true if VITE_FIREBASE_CONFIG_JSON exists and is valid JSON.
function hasClientConfig() {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG_JSON || "";
  if (!raw) return false;
  try {
    JSON.parse(raw);
    return true;
  } catch (e) {
    return false;
  }
}

export { hasClientConfig };
