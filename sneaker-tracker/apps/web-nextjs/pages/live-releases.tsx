import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebaseClient';
import Header from '../components/Header';
import styles from '../styles/Dashboard.module.css';

interface SneakerRelease {
  id: string;
  title?: string;
  name?: string;
  url?: string;
  brand?: string;
  price?: string;
  sku?: string;
  status?: string;
  release_date?: string | Timestamp;
  image_url?: string;
  source?: string;
  scraped_at?: string | Timestamp;
  created_at?: string | Timestamp;
  updated_at?: string | Timestamp;
}

const LiveReleases = () => {
  const [releases, setReleases] = useState<SneakerRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    try {
      const db = getFirestoreInstance();
      const sneakersRef = collection(db, 'sneakers_canonical');
      const q = query(
        sneakersRef, 
        orderBy('scraped_at', 'desc'),
        limit(50)
      );
      
      // Real-time subscription
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const releasesData: SneakerRelease[] = [];
          snapshot.forEach((doc) => {
            releasesData.push({
              id: doc.id,
              ...(doc.data() as Omit<SneakerRelease, 'id'>)
            });
          });
          setReleases(releasesData);
          setLastUpdate(new Date());
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching sneakers:', err);
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

  const formatTimestamp = (timestamp: string | Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch {
      return String(timestamp);
    }
  };

  const getStatusClass = (status?: string) => {
    if (!status) return styles.statusDefault;
    const s = status.toLowerCase();
    if (s === 'live' || s === 'released') return styles.statusLive;
    if (s === 'upcoming') return styles.statusUpcoming;
    if (s === 'sold out' || s === 'sold_out') return styles.statusSoldOut;
    return styles.statusDefault;
  };

  const getBrandColor = (brand?: string) => {
    if (!brand) return '#666';
    const b = brand.toLowerCase();
    if (b.includes('jordan')) return '#e74c3c';
    if (b.includes('nike')) return '#f39c12';
    if (b.includes('adidas')) return '#3498db';
    if (b.includes('yeezy')) return '#9b59b6';
    if (b.includes('new balance')) return '#1abc9c';
    return '#95a5a6';
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading live sneaker releases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className={styles.error}>
          <h2>⚠️ Connection Error</h2>
          <p>{error}</p>
          <details>
            <summary>Troubleshooting</summary>
            <ul>
              <li>Check NEXT_PUBLIC_FIREBASE_CONFIG in .env.local</li>
              <li>Verify Firebase project is active</li>
              <li>Ensure Firestore has 'sneakers_canonical' collection</li>
            </ul>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className={styles.container}>
        <div className={styles.headerSection}>
          <div>
            <h1 className={styles.title}>🔴 Live Sneaker Releases</h1>
            <p className={styles.subtitle}>
              Real-time updates from scrapers • {releases.length} releases
            </p>
          </div>
          <div className={styles.lastUpdate}>
            <span className={styles.liveIndicator}></span>
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{releases.length}</div>
            <div className={styles.statLabel}>Total Releases</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {new Set(releases.map(r => r.brand).filter(Boolean)).size}
            </div>
            <div className={styles.statLabel}>Brands</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {new Set(releases.map(r => r.source).filter(Boolean)).size}
            </div>
            <div className={styles.statLabel}>Sources</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {releases.filter(r => r.status?.toLowerCase() === 'upcoming').length}
            </div>
            <div className={styles.statLabel}>Upcoming</div>
          </div>
        </div>

        {releases.length === 0 ? (
          <div className={styles.empty}>
            <h2>No releases found</h2>
            <p>Run a scraper to populate data:</p>
            <pre className={styles.codeBlock}>
              cd sneaker-tracker/packages/scrapers/python{'\n'}
              python soleretriever_scraper_firebase.py --collection jordan --limit 10
            </pre>
          </div>
        ) : (
          <div className={styles.releasesGrid}>
            {releases.map((release) => {
              const displayName = release.title || release.name || 'Unknown Product';
              const statusClass = getStatusClass(release.status);
              const brandColor = getBrandColor(release.brand);

              return (
                <div key={release.id} className={styles.card}>
                  {release.image_url && (
                    <div className={styles.cardImage}>
                      <img src={release.image_url} alt={displayName} />
                    </div>
                  )}
                  
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.productName}>{displayName}</h2>
                      {release.brand && (
                        <span 
                          className={styles.brandBadge}
                          style={{ backgroundColor: brandColor }}
                        >
                          {release.brand}
                        </span>
                      )}
                    </div>
                    {release.status && (
                      <span className={`${styles.statusBadge} ${statusClass}`}>
                        {release.status}
                      </span>
                    )}
                  </div>

                  <div className={styles.metaGrid}>
                    {release.price && (
                      <div>
                        <strong>Price:</strong> {release.price}
                      </div>
                    )}
                    {release.sku && (
                      <div>
                        <strong>SKU:</strong> {release.sku}
                      </div>
                    )}
                    {release.release_date && (
                      <div>
                        <strong>Release:</strong> {formatTimestamp(release.release_date)}
                      </div>
                    )}
                    {release.source && (
                      <div>
                        <strong>Source:</strong> {release.source}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <small className={styles.timestamp}>
                      Scraped: {formatTimestamp(release.scraped_at)}
                    </small>
                    {release.url && (
                      <a 
                        href={release.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.viewLink}
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        .${styles.liveIndicator} {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #e74c3c;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .${styles.loadingSpinner} {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .${styles.headerSection} {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .${styles.lastUpdate} {
          text-align: right;
          font-size: 0.9rem;
          color: #666;
          display: flex;
          align-items: center;
        }

        .${styles.statsBar} {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .${styles.statCard} {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
          color: white;
        }

        .${styles.statValue} {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .${styles.statLabel} {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .${styles.cardImage} {
          width: 100%;
          height: 200px;
          overflow: hidden;
          border-radius: 8px 8px 0 0;
          background: #f5f5f5;
        }

        .${styles.cardImage} img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .${styles.cardFooter} {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .${styles.timestamp} {
          color: #999;
          font-size: 0.85rem;
        }

        .${styles.viewLink} {
          color: #3498db;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .${styles.viewLink}:hover {
          text-decoration: underline;
        }

        .${styles.codeBlock} {
          background: #2c3e50;
          color: #ecf0f1;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
};

export default LiveReleases;
