/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
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
  const [loadingFS, setLoadingFS] = useState(true);
  const [loadingPG, setLoadingPG] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorPG, setErrorPG] = useState<string | null>(null);
  const [pgUnavailable, setPgUnavailable] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // View preferences
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => storage.get('viewMode', 'grid'));
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'brand' | 'price'>(() => storage.get('sortBy', 'newest'));

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
    storage.set('viewMode', viewMode);
    storage.set('sortBy', sortBy);
  }, [showFirestore, showPostgres, brandFilter, statusFilter, viewMode, sortBy]);

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
  }, [showFirestore, showPostgres, brandFilter, statusFilter, search, router]);

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

  // Supabase/PostgREST fetch via secure API route with direct PostgREST fallback
  const fetchPgData = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (pgUnavailable) return;

    if (!append) setLoadingPG(true);
    else setLoadingMore(true);

    try {
      // Try API route first
      const params = new URLSearchParams({ limit: '50', offset: offset.toString() });
      let res = await fetch(`/api/releases?${params}`);
      let json: any;
      
      if (!res.ok || res.status === 500) {
        // API route failed (likely JWS key issue), fallback to direct PostgREST
        console.warn('API route failed, falling back to direct PostgREST');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3001';
        const directUrl = `${supabaseUrl}/soleretriever_data?select=id,url,title,brand,price,status,release_date,sku,image_url,source,scraped_at&order=scraped_at.desc&limit=50&offset=${offset}`;
        res = await fetch(directUrl);
        if (!res.ok) throw new Error(`Direct PostgREST fetch failed: ${res.status}`);
        
        // PostgREST returns array directly, wrap it
        const data = await res.json();
        json = { data, count: data.length };
        setErrorPG('Using direct database connection (dev mode)');
      } else {
        json = await res.json();
        setErrorPG(null);
      }

      const items: UnifiedRelease[] = (json.data as any[]).map((row: any) => ({
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
      setPgTotal(json.count || items.length);
      setPgUnavailable(false);

      if (!append) trackGA4Event('postgres_data_loaded', { count: items.length });
    } catch (e: any) {
      console.error('Postgres fetch failed:', e);
      const msg = e.message ?? 'Failed to load from database';
      setErrorPG(msg);
      setPgUnavailable(true);
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

  // Merge by URL
  const merged = useMemo(() => {
    const map = new Map<string, UnifiedRelease>();
    for (const item of pgItems) {
      const key = item.url || item.id;
      if (!map.has(key)) map.set(key, item);
    }
    for (const item of firestoreItems) {
      const key = item.url || item.id;
      map.set(key, item);
    }
    return Array.from(map.values());
  }, [pgItems, firestoreItems]);

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

  // Filter and sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = merged.filter((m) => {
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

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest' || sortBy === 'oldest') {
        const da = toDate(a.scraped_at)?.getTime() ?? 0;
        const db = toDate(b.scraped_at)?.getTime() ?? 0;
        return sortBy === 'newest' ? db - da : da - db;
      }
      if (sortBy === 'brand') {
        return (a.brand ?? '').localeCompare(b.brand ?? '');
      }
      if (sortBy === 'price') {
        const pa = parseFloat(String(a.price ?? '0').replace(/[^0-9.]/g, ''));
        const pb = parseFloat(String(b.price ?? '0').replace(/[^0-9.]/g, ''));
        return pb - pa;
      }
      return 0;
    });

    return result;
  }, [merged, showFirestore, showPostgres, brandFilter, statusFilter, search, sortBy]);

  const loading = loadingFS && loadingPG;

  const getStatusClass = (status?: string) => {
    if (!status) return styles.statusDefault;
    const s = status.toLowerCase();
    if (s === 'live' || s === 'released' || s.includes('stock')) return styles.statusLive;
    if (s === 'upcoming' || s === 'coming soon') return styles.statusUpcoming;
    if (s.includes('sold')) return styles.statusSoldOut;
    if (s.includes('raffle')) return styles.statusRaffle;
    return styles.statusDefault;
  };

  const clearAllFilters = () => {
    setBrandFilter(new Set());
    setStatusFilter(new Set());
    setSearch('');
    trackGA4Event('filter_clear', { type: 'all' });
  };

  const hasActiveFilters = brandFilter.size > 0 || statusFilter.size > 0 || search.length > 0;

  return (
    <div>
      <Header />
      <main className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>🔥 Sneaker Tracker</h1>
          <p className={styles.subtitle}>
            Real-time releases from Firestore + Postgres
          </p>
        </div>

        {/* Stats Summary */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Releases</div>
            <div className={styles.statValue}>{merged.length}</div>
            <div className={styles.statSubtext}>All sources</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Firestore</div>
            <div className={styles.statValue}>{firestoreItems.length}</div>
            <div className={styles.statSubtext}>Live data</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Postgres</div>
            <div className={styles.statValue}>{pgItems.length}</div>
            <div className={styles.statSubtext}>Archive data</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Showing</div>
            <div className={styles.statValue}>{filtered.length}</div>
            <div className={styles.statSubtext}>After filters</div>
          </div>
        </div>

        {/* Error Banner */}
        {pgUnavailable && errorPG && (
          <div className={styles.banner}>
            <span className={styles.bannerIcon}>⚠️</span>
            <span>Postgres unavailable: {errorPG}. Showing Firestore data only.</span>
            <button className={styles.bannerDismiss} onClick={() => setPgUnavailable(false)}>
              ×
            </button>
          </div>
        )}

        {/* Filters Section */}
        <div className={styles.filtersSection}>
          <div className={styles.filtersTitle}>
            🔍 Filters & Search
            {hasActiveFilters && (
              <button className={styles.clearFilters} onClick={clearAllFilters}>
                Clear All
              </button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterGroupLabel}>Search</div>
            <input
              type="text"
              placeholder="Search by title, brand, or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) trackGA4Event('search', { search_term: e.target.value });
              }}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterGroupLabel}>Data Sources</div>
            <div className={styles.filtersRow}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={showFirestore}
                  onChange={(e) => {
                    setShowFirestore(e.target.checked);
                    trackGA4Event('filter_toggle', { source: 'firestore', enabled: e.target.checked });
                  }}
                />
                <span>Firestore ({firestoreItems.length})</span>
              </label>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={showPostgres}
                  onChange={(e) => {
                    setShowPostgres(e.target.checked);
                    trackGA4Event('filter_toggle', { source: 'postgres', enabled: e.target.checked });
                  }}
                />
                <span>Postgres ({pgItems.length})</span>
              </label>
            </div>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterGroupLabel}>Brands</div>
            <div className={styles.filtersRow}>
              <button
                className={`${styles.chipButton} ${brandFilter.size === 0 ? styles.chipActive : ''}`}
                onClick={() => {
                  setBrandFilter(new Set());
                  trackGA4Event('filter_clear', { type: 'brand' });
                }}
              >
                All Brands
              </button>
              {brands.map((b) => {
                const isActive = brandFilter.has(b);
                return (
                  <button
                    key={b}
                    className={`${styles.chipButton} ${isActive ? styles.chipActive : ''}`}
                    onClick={() => {
                      const next = new Set(brandFilter);
                      if (isActive) next.delete(b);
                      else next.add(b);
                      setBrandFilter(next);
                      trackGA4Event('filter_brand', { brand: b, enabled: !isActive });
                    }}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterGroupLabel}>Status</div>
            <div className={styles.filtersRow}>
              <button
                className={`${styles.chipButton} ${statusFilter.size === 0 ? styles.chipActive : ''}`}
                onClick={() => {
                  setStatusFilter(new Set());
                  trackGA4Event('filter_clear', { type: 'status' });
                }}
              >
                All Status
              </button>
              {statuses.map((s) => {
                const isActive = statusFilter.has(s);
                return (
                  <button
                    key={s}
                    className={`${styles.chipButton} ${isActive ? styles.chipActive : ''}`}
                    onClick={() => {
                      const next = new Set(statusFilter);
                      if (isActive) next.delete(s);
                      else next.add(s);
                      setStatusFilter(next);
                      trackGA4Event('filter_status', { status: s, enabled: !isActive });
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'grid' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('grid')}
            >
              🔲 Grid
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
          </div>

          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="brand">Brand A-Z</option>
            <option value="price">Price High-Low</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={viewMode === 'grid' ? styles.releasesGrid : styles.releasesGridList}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonBadge} />
                <div className={styles.skeletonText} style={{ width: '90%' }} />
                <div className={styles.skeletonText} style={{ width: '60%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>
            <p style={{ fontSize: '3rem', margin: 0 }}>🔍</p>
            <p>No releases found matching your filters</p>
            {hasActiveFilters && (
              <button className={styles.clearFilters} onClick={clearAllFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className={viewMode === 'grid' ? styles.releasesGrid : styles.releasesGridList}>
            {filtered.map((item) => {
              const displayTitle = item.title || item.name || 'Untitled';
              const displayPrice = item.price ? `$${item.price}` : 'TBD';
              
              return (
                <div key={item.id} className={`${styles.card} ${viewMode === 'list' ? styles.cardList : ''}`}>
                  {/* Product Image */}
                  <div className={`${styles.cardImage} ${viewMode === 'list' ? styles.cardImageList : ''}`}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={displayTitle} />
                    ) : (
                      <span>👟</span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <div>
                        {item.brand && (
                          <span className={styles.brandBadge}>{item.brand}</span>
                        )}
                        <h3 className={styles.productName}>{displayTitle}</h3>
                      </div>
                      {item.status && (
                        <span className={`${styles.statusBadge} ${getStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      )}
                    </div>

                    <div className={styles.metaGrid}>
                      {item.sku && (
                        <div><strong>SKU:</strong> {item.sku}</div>
                      )}
                      <div><strong>Price:</strong> {displayPrice}</div>
                      {item.release_date && (
                        <div><strong>Release:</strong> {toDate(item.release_date)?.toLocaleDateString() ?? 'TBD'}</div>
                      )}
                      <div><strong>Source:</strong> {item.origin}</div>
                    </div>

                    {item.url && (
                      <div className={styles.cardActions}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.cardActionLink}
                        >
                          View Product →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        {showPostgres && !pgUnavailable && pgItems.length < pgTotal && (
          <div ref={sentinelRef} style={{ height: '20px', margin: '2rem 0' }}>
            {loadingMore && <div className={styles.loading}>Loading more...</div>}
          </div>
        )}
      </main>
    </div>
  );
};

export default UnifiedDashboard;
