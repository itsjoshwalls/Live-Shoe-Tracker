import React, { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { getFirestoreInstance } from "../lib/firebaseClient";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment } from "firebase/firestore";
import type { SneakerRelease } from "../types/sneaker";
import styles from "../styles/Mileage.module.css";
import { EnvGate } from "../components/EnvGate";

const MileageTracker = () => {
  const { user, isAdmin } = useAuth();
  const [releases, setReleases] = useState<SneakerRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const collectionName = process.env.NEXT_PUBLIC_FIRESTORE_MILEAGE_COLLECTION || "sneakers";

  useEffect(() => {
    setLoading(true);
    try {
      const db = getFirestoreInstance();
      const releasesRef = collection(db, collectionName);
      const q = query(releasesRef, orderBy("name"));
      
      const unsub = onSnapshot(q, (snapshot) => {
        const items: SneakerRelease[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as SneakerRelease));
        setReleases(items);
        setLoading(false);
      }, (error) => {
        console.error("Error listening to collection:", error);
        setLoading(false);
      });

      return () => unsub();
    } catch (error) {
      console.error("Failed to initialize Firestore listener:", error);
      setLoading(false);
    }
  }, [collectionName]);

  const handleIncrement = async (id: string) => {
    if (!user) {
      alert("Please sign in to increment mileage.");
      return;
    }
    if (!isAdmin) {
      alert("Only admin users may increment mileage from the client.");
      return;
    }
    try {
      const db = getFirestoreInstance();
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, { mileage: increment(1) });
    } catch (e) {
      console.error("Failed to increment mileage:", e);
      alert("Failed to increment mileage. Check console for details and ensure Firestore rules allow this write.");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Mileage Tracker</h1>
      
      <div className={styles.authInfo}>
        {user ? (
          <div className={styles.authDetails}>
            <span>Signed in as {user.displayName || user.email}</span>
            {isAdmin && <span className={styles.adminBadge}>(admin)</span>}
          </div>
        ) : (
          <div>
            <p className={styles.signInPrompt}>
              Sign in from the header to enable admin actions (if you have the admin claim).
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : releases.length === 0 ? (
        <p>No sneakers found in collection '{collectionName}'.</p>
      ) : (
        <div className={styles.grid}>
          {releases.map((shoe) => (
            <div key={shoe.id} className={styles.card}>
              <div className={styles.cardContent}>
                <h2>{shoe.name || shoe.title || shoe.productName || "Unnamed"}</h2>
                {shoe.date && <p>Release Date: {shoe.date}</p>}
                {shoe.price && <p>Retail Price: {shoe.price}</p>}
                <p className={styles.mileageValue}>Mileage: {shoe.mileage ?? 0}</p>
              </div>
              <div>
                <button onClick={() => handleIncrement(shoe.id)} className={styles.incrementBtn}>
                  + Mileage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Page = () => (
  <EnvGate requireFirebase>
    <MileageTracker />
  </EnvGate>
);

export default Page;
