import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchReleases } from '../lib/api';
import Header from '../components/Header';
import styles from '../styles/Dashboard.module.css';

interface SneakerRelease {
  id: string;
  name: string;
  url?: string;
  brand?: string;
  price?: number;
  sku?: string;
  status?: string;
  date?: string;
  images?: string[];
  colorway?: string;
  retailPrice?: number;
  resellPrice?: number;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const LiveReleases = () => {
  const [releases, setReleases] = useState<SneakerRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const loadReleases = async () => {
      try {
        const data = await fetchReleases();
        setReleases(data.slice(0, 50) as SneakerRelease[]);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (err: any) {
        console.error('API error:', err);
        setError(err.message || 'Failed to fetch releases from API');
        setLoading(false);
      }
    };

    loadReleases();
    
    // Set up Socket.IO connection for real-time updates
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    // Listen for release updates from the server
    newSocket.on('releases:updated', (updatedReleases: SneakerRelease[]) => {
      console.log('Received real-time update:', updatedReleases.length, 'releases');
      setReleases(updatedReleases.slice(0, 50));
      setLastUpdate(new Date());
    });

    newSocket.on('release:new', (newRelease: SneakerRelease) => {
      console.log('New release added:', newRelease.name);
      setReleases(prev => [newRelease, ...prev].slice(0, 50));
      setLastUpdate(new Date());
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A';
    
    try {
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
              {releases.filter(r => r.status?.toLowerCase() === 'upcoming').length}
            </div>
            <div className={styles.statLabel}>Upcoming</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {isConnected ? '🟢 Live' : '🔴 Offline'}
            </div>
            <div className={styles.statLabel}>Socket Status</div>
          </div>
        </div>

        {releases.length === 0 ? (
          <div className={styles.empty}>
            <h2>No releases found</h2>
            <p>The database is connected but empty. Run a scraper to populate data:</p>
            <pre className={styles.codeBlock}>
              # Set up Supabase credentials{'\n'}
              $env:SUPABASE_URL = "https://npvqqzuofwojhbdlozgh.supabase.co"{'\n'}
              $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"{'\n'}
              {'\n'}
              # Run the image scraper{'\n'}
              cd shoe-tracker{'\n'}
              python scripts/supabase_image_scraper.py
            </pre>
          </div>
        ) : (
          <div className={styles.releasesGrid}>
            {releases.map((release) => {
              const displayName = release.name || 'Unknown Product';
              const statusClass = getStatusClass(release.status);
              const brandColor = getBrandColor(release.brand);
              const primaryImage = release.images && release.images.length > 0 ? release.images[0] : null;

              return (
                <div key={release.id} className={styles.card}>
                  {primaryImage ? (
                    <div className={styles.cardImage}>
                      <img src={primaryImage} alt={displayName} />
                    </div>
                  ) : (
                    <div className={styles.cardImage}>
                      <div className={styles.placeholderImage}>
                        <span>👟</span>
                        <p>No image available</p>
                      </div>
                    </div>
                  )}
                  
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.productName}>{displayName}</h2>
                      {release.brand && (
                        <span className={`${styles.brandBadge} ${styles.brandBadge}--${release.brand.toLowerCase().replace(/\s+/g, '-')}`}>
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
                        <strong>Price:</strong> ${release.price}
                      </div>
                    )}
                    {release.sku && (
                      <div>
                        <strong>SKU:</strong> {release.sku}
                      </div>
                    )}
                    {release.date && (
                      <div>
                        <strong>Release:</strong> {formatTimestamp(release.date)}
                      </div>
                    )}
                    {release.colorway && (
                      <div>
                        <strong>Colorway:</strong> {release.colorway}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <small className={styles.timestamp}>
                      Updated: {formatTimestamp(release.updated_at)}
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

        .${styles.placeholderImage} {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
          color: #999;
        }

        .${styles.placeholderImage} span {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .${styles.placeholderImage} p {
          margin: 0;
          font-size: 0.85rem;
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
