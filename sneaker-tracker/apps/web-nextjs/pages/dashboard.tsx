import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebaseClient';
import Header from '../components/Header';
import styles from '../styles/Dashboard.module.css';

interface Release {
  id: string;
  // Legacy fields
  productName?: string;
  name?: string;
  retailerId?: string;
  retailerName?: string;
  releaseDate?: string;
  locations?: string[];
  // Scraper fields (from sneakers_canonical)
  title?: string;
  url?: string;
  image_url?: string;
  source?: string;
  release_date?: string | Timestamp;
  scraped_at?: string | Timestamp;
  // Shared fields
  status?: string;
  brand?: string;
  price?: number | string;
  sku?: string;
}

const Dashboard = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const db = getFirestoreInstance();
      const releasesRef = collection(db, 'sneakers_canonical');
      const q = query(releasesRef, orderBy('scraped_at', 'desc'));
      
      // Real-time subscription
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const releasesData: Release[] = [];
          snapshot.forEach((doc) => {
            releasesData.push({
              id: doc.id,
              ...(doc.data() as Omit<Release, 'id'>)
            });
          });
          setReleases(releasesData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching releases:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Firebase initialization error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div>
        <Header />
        <div className={styles.loading}>Loading releases...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className={styles.error}>
          Error: {error}
          <br />
          <small>Make sure NEXT_PUBLIC_FIREBASE_CONFIG is set in your environment</small>
        </div>
      </div>
    );
  }

  const getStatusClass = (status?: string) => {
    if (!status) return styles.statusDefault;
    const s = status.toUpperCase();
    if (s === 'LIVE') return styles.statusLive;
    if (s === 'UPCOMING') return styles.statusUpcoming;
    if (s === 'SOLD OUT') return styles.statusSoldOut;
    if (s.includes('RAFFLE')) return styles.statusRaffle;
    return styles.statusDefault;
  };

  return (
    <div>
      <Header />
      <main className={styles.container}>
        <h1 className={styles.title}>Shoe Releases Dashboard</h1>
        <p className={styles.subtitle}>Real-time scraper data • {releases.length} releases • Last update: {new Date().toLocaleTimeString()}</p>

        <div className={styles.mileageCta}>
          <h3>🚗 Track Mileage</h3>
          <p>Log wear mileage for rotating pairs and get alerts when it's time to retire them or schedule cleaning.</p>
          <a href="/mileage" className={styles.mileageButton}>Go to Mileage →</a>
        </div>

        {releases.length === 0 ? (
          <div className={styles.empty}>
            <p>No releases found in sneakers_canonical collection.</p>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
              Run a scraper to populate data:<br />
              <code style={{ background: '#f5f5f5', padding: '0.5rem', display: 'inline-block', marginTop: '0.5rem' }}>
                python soleretriever_scraper_firebase.py --collection jordan --limit 10
              </code>
            </p>
          </div>
        ) : (
          <div className={styles.releasesGrid}>
            {releases.map((release) => {
              const statusClass = release.status ? getStatusClass(release.status) : styles.statusDefault;
              const displayName = release.title || release.productName || release.name || 'Unknown Product';
              const displayDate = release.release_date || release.releaseDate;
              
              return (
                <div key={release.id} className={styles.card}>
                  {release.image_url && (
                    <div className={styles.cardImage}>
                      <img src={release.image_url} alt={displayName} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.productName}>{displayName}</h2>
                      {release.brand && (
                        <span className={styles.brandBadge}>{release.brand}</span>
                      )}
                    </div>
                    {release.status && (
                      <span className={`${styles.statusBadge} ${statusClass}`}>{release.status}</span>
                    )}
                  </div>

                  <div className={styles.metaGrid}>
                    {(release.source || release.retailerName) && (
                      <div>
                        <strong>Source:</strong> {release.source || release.retailerName}
                      </div>
                    )}
                    {release.price && (
                      <div>
                        <strong>Price:</strong> {typeof release.price === 'number' ? `$${release.price.toFixed(2)}` : release.price}
                      </div>
                    )}
                    {release.sku && (
                      <div>
                        <strong>SKU:</strong> {release.sku}
                      </div>
                    )}
                    {displayDate && (
                      <div>
                        <strong>Release:</strong> {displayDate instanceof Timestamp ? displayDate.toDate().toLocaleDateString() : new Date(displayDate).toLocaleDateString()}
                      </div>
                    )}
                    {release.scraped_at && (
                      <div style={{ fontSize: '0.85rem', color: '#999' }}>
                        <strong>Scraped:</strong> {release.scraped_at instanceof Timestamp ? release.scraped_at.toDate().toLocaleString() : new Date(release.scraped_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    {release.url && (
                      <a href={release.url} target="_blank" rel="noopener noreferrer" className={styles.cardActionLink}>
                        View Product →
                      </a>
                    )}
                    <a href="/mileage" className={styles.cardActionLink}>
                      Track mileage →
                    </a>
                  </div>

                  {release.locations && release.locations.length > 0 && (
                    <div className={styles.locations}>
                      <strong>Available at:</strong> {release.locations.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;