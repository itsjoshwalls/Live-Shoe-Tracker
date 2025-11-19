import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebaseClient';
import { trackGA4Event, storage } from '../lib/clientUtils';
import Header from '../components/Header';
import styles from '../styles/Dashboard.module.css';

type TS = string | Timestamp | undefined | null;

interface UnifiedRelease {
  id: string;
  url?: string;
  title?: string;
  name?: string;
  brand?: string;
  price?: string | number;
  status?: string;
  release_date?: TS;
  sku?: string;
  image_url?: string;
  source?: string;
  scraped_at?: TS;
  origin: 'firestore' | 'postgres';
}

function toDate(ts: TS): Date | null {
  if (!ts) return null;
  try {
    if (ts instanceof Timestamp) return ts.toDate();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

const UnifiedDashboard = () => {
  const router = useRouter();
  const [firestoreItems, setFirestoreItems] = useState<UnifiedRelease[]>([]);
  const [pgItems, setPgItems] = useState<UnifiedRelease[]>([]);
  const [pgTotal, setPgTotal] = useState(0);
  const [pgOffset, setPgOffset] = useState(0);
  const [loadingFS, setLoadingFS] = useState(true);
  const [loadingPG, setLoadingPG] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorPG, setErrorPG] = useState<string | null>(null);
  const [pgUnavailable, setPgUnavailable] = useState(false); // Fallback flag
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Quick filters state (sync with URL + localStorage)
  const [showFirestore, setShowFirestore] = useState(() => {
    const urlVal = router.query.fs;
    const stored = storage.get('filter_showFirestore', true);
    return urlVal !== undefined ? urlVal !== 'false' : stored;
  });
  const [showPostgres, setShowPostgres] = useState(() => {
    const urlVal = router.query.pg;
    const stored = storage.get('filter_showPostgres', true);
    return urlVal !== undefined ? urlVal !== 'false' : stored;
  });
  const [brandFilter, setBrandFilter] = useState<Set<string>>(() => {
    const brands = router.query.brands as string | undefined;
    const stored = storage.get<string[]>('filter_brands', []);
    return brands ? new Set(brands.split(',')) : new Set(stored);
  });
  const [statusFilter, setStatusFilter] = useState<Set<string>>(() => {
    const statuses = router.query.statuses as string | undefined;
    const stored = storage.get<string[]>('filter_statuses', []);
    return statuses ? new Set(statuses.split(',')) : new Set(stored);
  });
  const [search, setSearch] = useState(() => (router.query.q as string) || '');

  // Persist filters to localStorage
  useEffect(() => {
    storage.set('filter_showFirestore', showFirestore);
    storage.set('filter_showPostgres', showPostgres);
    storage.set('filter_brands', Array.from(brandFilter));
    storage.set('filter_statuses', Array.from(statusFilter));
  }, [showFirestore, showPostgres, brandFilter, statusFilter]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (!showFirestore) params.set('fs', 'false');
    if (!showPostgres) params.set('pg', 'false');
    if (brandFilter.size) params.set('brands', Array.from(brandFilter).join(','));
    if (statusFilter.size) params.set('statuses', Array.from(statusFilter).join(','));
    if (search) params.set('q', search);
    const queryString = params.toString();
    const newUrl = queryString ? `${router.pathname}?${queryString}` : router.pathname;
    router.replace(newUrl, undefined, { shallow: true });
  }, [showFirestore, showPostgres, brandFilter, statusFilter, search]);

  // Firestore live listener
  useEffect(() => {
    try {
      const db = getFirestoreInstance();
      const ref = collection(db, 'sneakers_canonical');
      const qy = query(ref, orderBy('scraped_at', 'desc'));
      const unsub = onSnapshot(
        qy,
        (snap) => {
          const items: UnifiedRelease[] = snap.docs.map((doc) => {
            const data = doc.data() as any;
            return {
              id: doc.id,
              url: data.url,
              title: data.title ?? data.name ?? data.productName,
              name: data.name,
              brand: data.brand,
              price: data.price,
              status: data.status,
              release_date: data.release_date ?? data.releaseDate,
              sku: data.sku,
              image_url: data.image_url,
              source: data.source ?? 'firestore',
              scraped_at: data.scraped_at,
              origin: 'firestore',
            };
          });
          setFirestoreItems(items);
          setLoadingFS(false);
        },
        (err) => {
          // We keep UI usable with PG data even if FS fails
          console.error('Firestore listener error:', err);
          setLoadingFS(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error('Firestore init error:', e);
      setLoadingFS(false);
    }
  }, []);

  // Supabase/PostgREST fetch via secure API route with fallback
  const fetchPgData = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (pgUnavailable) return; // Skip if already marked unavailable
    
    if (!append) setLoadingPG(true);
    else setLoadingMore(true);
    
    try {
      const params = new URLSearchParams({ limit: '50', offset: offset.toString() });
      const res = await fetch(`/api/releases?${params}`);
      if (!res.ok) throw new Error(`API fetch failed: ${res.status}`);
      const json = await res.json();
      
      const items: UnifiedRelease[] = (json.data as any[]).map((row) => ({
        id: row.id ?? row.url ?? Math.random().toString(36).slice(2),
        url: row.url,
        title: row.title,
        brand: row.brand,
        price: row.price,
        status: row.status,
        release_date: row.release_date,
        sku: row.sku,
        image_url: row.image_url,
        source: row.source ?? 'postgres',
        scraped_at: row.scraped_at,
        origin: 'postgres',
      }));
      
      if (append) {
        setPgItems(prev => [...prev, ...items]);
      } else {
        setPgItems(items);
      }
      setPgTotal(json.count || 0);
      setErrorPG(null);
      setPgUnavailable(false);
      
      // Track successful load
      if (!append) trackGA4Event('postgres_data_loaded', { count: items.length });
    } catch (e: any) {
      console.error('Postgres fetch failed:', e);
      const msg = e.message ?? 'Failed to load from Supabase';
      setErrorPG(msg);
      setPgUnavailable(true); // Mark as unavailable
      
      // Track error
      trackGA4Event('postgres_fetch_error', { error: msg });
    } finally {
      setLoadingPG(false);
      setLoadingMore(false);
    }
  }, [pgUnavailable]);

  useEffect(() => {
    fetchPgData(0, false);
  }, [fetchPgData]);

  // Infinite scroll observer
  useEffect(() => {
    if (loadingMore || pgItems.length >= pgTotal) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          const nextOffset = pgItems.length;
          if (nextOffset < pgTotal) {
            fetchPgData(nextOffset, true);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pgItems.length, pgTotal, loadingMore, fetchPgData]);

  // Merge by URL (prefer Firestore for more real-time freshness)
  const merged = useMemo(() => {
    const map = new Map<string, UnifiedRelease>();
    for (const item of pgItems) {
      const key = item.url || item.id;
      if (!map.has(key)) map.set(key, item);
    }
    for (const item of firestoreItems) {
      const key = item.url || item.id;
      // Firestore overrides Postgres entry for same URL
      map.set(key, item);
    }
    const list = Array.from(map.values());
    list.sort((a, b) => {
      const da = toDate(a.scraped_at)?.getTime() ?? 0;
      const db = toDate(b.scraped_at)?.getTime() ?? 0;
      return db - da;
    });
    return list;
  }, [pgItems, firestoreItems]);

  const loading = loadingFS && loadingPG;

  // Distinct brands and statuses
  const { brands, statuses } = useMemo(() => {
    const b = new Set<string>();
    const s = new Set<string>();
    for (const item of merged) {
      if (item.brand) b.add(item.brand);
      if (item.status) s.add(item.status);
    }
    return {
      brands: Array.from(b).sort((a, z) => a.localeCompare(z)),
      statuses: Array.from(s).sort((a, z) => a.localeCompare(z)),
    };
  }, [merged]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merged.filter((m) => {
      if (!showFirestore && m.origin === 'firestore') return false;
      if (!showPostgres && m.origin === 'postgres') return false;
      if (brandFilter.size && (!m.brand || !brandFilter.has(m.brand))) return false;
      if (statusFilter.size && (!m.status || !statusFilter.has(m.status))) return false;
      if (q) {
        const hay = `${m.title ?? ''} ${m.name ?? ''} ${m.brand ?? ''} ${m.sku ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [merged, showFirestore, showPostgres, brandFilter, statusFilter, search]);

  const getStatusClass = (status?: string) => {
    if (!status) return styles.statusDefault;
    const s = status.toLowerCase();
    if (s === 'live' || s === 'released') return styles.statusLive;
    if (s === 'upcoming') return styles.statusUpcoming;
    if (s.includes('sold')) return styles.statusSoldOut;
    return styles.statusDefault;
  };

  return (
    <div>
      <Header />
      <main className={styles.container}>
        <h1 className={styles.title}>Unified Releases (Firestore + Postgres)</h1>
        <p className={styles.subtitle}>
          Live Firestore + SQL via Supabase • {merged.length} total
        </p>

        {/* Filters */}
        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <label className={`${styles.cardActionLink} ${styles.toggleLabel}`}>
              <input
                type="checkbox"
                checked={showFirestore}
                onChange={(e) => {
                  setShowFirestore(e.target.checked);
                  trackGA4Event('filter_toggle', { source: 'firestore', enabled: e.target.checked });
                }}
              />
              Firestore
            </label>
            <div className={styles.statValue}>{firestoreItems.length}</div>
          </div>
          <div className={styles.statCard}>
            <label className={`${styles.cardActionLink} ${styles.toggleLabel}`}>
              <input
                type="checkbox"
                checked={showPostgres}
                onChange={(e) => {
                  setShowPostgres(e.target.checked);
                  trackGA4Event('filter_toggle', { source: 'postgres', enabled: e.target.checked });
                }}
              />
              Postgres
            </label>
            <div className={styles.statValue}>{pgItems.length}</div>
          </div>
          <div className={styles.statCard}>
            <input
              type="text"
              placeholder="Search title, brand, SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) trackGA4Event('search', { search_term: e.target.value });
              }}
              className={styles.searchInput}
            />
            <div className={styles.statLabel}>Search</div>
          </div>
        </div>

        <div className={styles.filtersRow}>
          <div>
            <strong>Brands:</strong>
            <button
              className={`${styles.brandBadge} ${styles.chipButton} ${brandFilter.size === 0 ? styles.chipActive : ''}`}
              onClick={() => {
                setBrandFilter(new Set());
                trackGA4Event('filter_clear', { type: 'brand' });
              }}
            >
              All
            </button>
            {brands.map((b) => {
              const active = brandFilter.has(b);
              return (
                <button
                  key={b}
                  className={`${styles.brandBadge} ${styles.chipButton} ${active ? styles.chipActive : ''}`}
                  onClick={() => {
                    const next = new Set(brandFilter);
                    if (active) next.delete(b); else next.add(b);
                    setBrandFilter(next);
                    trackGA4Event('filter_brand', { brand: b, action: active ? 'remove' : 'add' });
                  }}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.filtersRow}>
          <div>
            <strong>Status:</strong>
            <button
              className={`${styles.statusBadge} ${styles.chipButton} ${statusFilter.size === 0 ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter(new Set())}
            >
              All
            </button>
            {statuses.map((s) => {
              const active = statusFilter.has(s);
              const cls = `${styles.statusBadge} ${getStatusClass(s)}`;
              return (
                <button
                  key={s}
                  className={`${cls} ${styles.chipButton} ${active ? styles.chipActive : ''}`}
                  onClick={() => {
                    const next = new Set(statusFilter);
                    if (active) next.delete(s); else next.add(s);
                    setStatusFilter(next);
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{firestoreItems.length}</div>
            <div className={styles.statLabel}>Firestore</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{pgItems.length}</div>
            <div className={styles.statLabel}>Postgres</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{new Set(merged.map(m => m.brand).filter(Boolean)).size}</div>
            <div className={styles.statLabel}>Brands</div>
          </div>
        </div>

        {loading && (
          <div className={styles.releasesGrid}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonBadge} />
                <div className={styles.skeletonText} />
                <div className={styles.skeletonText} />
              </div>
            ))}
          </div>
        )}

        {!!errorPG && pgUnavailable && (
          <div className={styles.banner}>
            <span className={styles.bannerIcon}>⚠️</span>
            <div>
              <strong>Postgres unavailable</strong> — Showing Firestore data only. {errorPG}
            </div>
            <button className={styles.bannerDismiss} onClick={() => setErrorPG(null)}>×</button>
          </div>
        )}

        {filtered.length === 0 && !loading ? (
          <div className={styles.empty}>No releases found from either source.</div>
        ) : (
          <>
            <div className={styles.releasesGrid}>
              {filtered.map((item) => {
                const display = item.title || item.name || 'Unknown Product';
                const statusClass = getStatusClass(item.status);
                return (
                  <div key={`${item.origin}:${item.id}`} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h2 className={styles.productName}>{display}</h2>
                        {item.brand && (
                          <span className={styles.brandBadge}>{item.brand}</span>
                        )}
                      </div>
                      <div>
                        <span className={`${styles.statusBadge} ${statusClass}`}>{item.status ?? 'unknown'}</span>
                      </div>
                    </div>

                    <div className={styles.metaGrid}>
                      {item.price && (
                        <div>
                          <strong>Price:</strong> {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}
                        </div>
                      )}
                      {item.sku && (
                        <div>
                          <strong>SKU:</strong> {item.sku}
                        </div>
                      )}
                      {item.source && (
                        <div>
                          <strong>Source:</strong> {item.source} ({item.origin})
                        </div>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.cardActionLink}>
                          View Product →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Infinite scroll sentinel */}
            {showPostgres && pgItems.length < pgTotal && (
              <div ref={sentinelRef} className={styles.loading}>
                {loadingMore ? 'Loading more...' : 'Scroll for more'}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default UnifiedDashboard;
