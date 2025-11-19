/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebaseClient';
import Header from '../components/Header';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/Analytics.module.css';

interface AnalyticsData {
  totalRetailers: number;
  totalReleases: number;
  totalActiveReleases: number;
  totalUsers: number;
  totalAlerts: number;
  lastUpdate: string;
  
  // Release analytics
  releasesByStatus: Record<string, number>;
  releasesByRetailer: Record<string, number>;
  releasesByBrand: Record<string, number>;
  
  // Retailer insights
  retailers: Array<{
    id: string;
    name: string;
    region?: string;
    releaseCount: number;
    activeCount: number;
  }>;
}

const AnalyticsPage = () => {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const db = getFirestoreInstance();

      // Fetch releases
      const releasesSnapshot = await getDocs(collection(db, 'releases'));
      const releases = releasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch retailers
      const retailersSnapshot = await getDocs(collection(db, 'retailers'));
      const retailers = retailersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch users (if admin)
      let usersCount = 0;
      if (isAdmin) {
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          usersCount = usersSnapshot.size;
        } catch (e) {
          console.warn('Could not fetch users:', e);
        }
      }

      // Fetch alerts (user's own or all if admin)
      let alertsCount = 0;
      try {
        const alertsRef = collection(db, 'user_alerts');
        const alertsQuery = isAdmin 
          ? alertsRef 
          : query(alertsRef, where('userId', '==', user?.uid));
        const alertsSnapshot = await getDocs(alertsQuery);
        alertsCount = alertsSnapshot.size;
      } catch (e) {
        console.warn('Could not fetch alerts:', e);
      }

      // Process analytics
      const releasesByStatus: Record<string, number> = {};
      const releasesByRetailer: Record<string, number> = {};
      const releasesByBrand: Record<string, number> = {};
      let activeCount = 0;

      releases.forEach((release: any) => {
        const status = release.status || 'UNKNOWN';
        releasesByStatus[status] = (releasesByStatus[status] || 0) + 1;

        if (['LIVE', 'UPCOMING', 'RAFFLE OPEN'].includes(status.toUpperCase())) {
          activeCount++;
        }

        const retailer = release.retailerName || release.retailerId || 'Unknown';
        releasesByRetailer[retailer] = (releasesByRetailer[retailer] || 0) + 1;

        const brand = release.brand || 'Unknown';
        releasesByBrand[brand] = (releasesByBrand[brand] || 0) + 1;
      });

      // Build retailer insights
      const retailerInsights = retailers.map((retailer: any) => {
        const releaseCount = releases.filter(
          (r: any) => r.retailerId === retailer.id || r.retailerName === retailer.name
        ).length;
        const activeReleaseCount = releases.filter(
          (r: any) =>
            (r.retailerId === retailer.id || r.retailerName === retailer.name) &&
            ['LIVE', 'UPCOMING', 'RAFFLE OPEN'].includes((r.status || '').toUpperCase())
        ).length;

        return {
          id: retailer.id,
          name: retailer.name || retailer.id,
          region: retailer.region,
          releaseCount,
          activeCount: activeReleaseCount,
        };
      }).sort((a, b) => b.releaseCount - a.releaseCount);

      setData({
        totalRetailers: retailers.length,
        totalReleases: releases.length,
        totalActiveReleases: activeCount,
        totalUsers: usersCount,
        totalAlerts: alertsCount,
        lastUpdate: new Date().toISOString(),
        releasesByStatus,
        releasesByRetailer,
        releasesByBrand,
        retailers: retailerInsights,
      });
      setError(null);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1>Analytics Dashboard</h1>
          <p>Please sign in to view analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <Header />
        <div className={styles.container}>Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className={`${styles.container} ${styles.error}`}>
          Error loading analytics: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <Header />
      <main className={styles.container}>
        <h1>Analytics Dashboard</h1>
        <p className={styles.subtitle}>
          Last updated: {new Date(data.lastUpdate).toLocaleString()}
        </p>

        {/* Overview Cards */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>{data.totalRetailers}</div>
            <div className={styles.metricLabel}>Total Retailers</div>
          </div>
          
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>{data.totalReleases}</div>
            <div className={styles.metricLabel}>Total Releases</div>
          </div>
          
          <div className={`${styles.metricCard} ${styles.metricCardHighlight}`}>
            <div className={styles.metricValue}>{data.totalActiveReleases}</div>
            <div className={styles.metricLabel}>Active Releases</div>
          </div>
          
          {isAdmin && (
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>{data.totalUsers}</div>
              <div className={styles.metricLabel}>Total Users</div>
            </div>
          )}
          
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>{data.totalAlerts}</div>
            <div className={styles.metricLabel}>{isAdmin ? 'Total Alerts' : 'My Alerts'}</div>
          </div>
        </div>

        {/* Releases by Status */}
        <div className={styles.section}>
          <h2>Releases by Status</h2>
          <div className={styles.chartContainer}>
            {Object.entries(data.releasesByStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className={styles.barItem}>
                  <div className={styles.barLabel}>{status}</div>
                  <div className={styles.barWrapper}>
                    <div className={`${styles.barFill} ${getStatusClass(status)} ${getWidthClass((count / data.totalReleases) * 100)}`} />
                    <div className={styles.barValue}>{count}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Releases by Brand */}
        <div className={styles.section}>
          <h2>Releases by Brand</h2>
          <div className={styles.chartContainer}>
            {Object.entries(data.releasesByBrand)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([brand, count]) => (
                <div key={brand} className={styles.barItem}>
                  <div className={styles.barLabel}>{brand}</div>
                  <div className={styles.barWrapper}>
                    <div className={`${styles.barFill} ${styles.brandBar} ${getWidthClass((count / data.totalReleases) * 100)}`} />
                    <div className={styles.barValue}>{count}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Retailer Insights Table */}
        <div className={styles.section}>
          <h2>Retailer Insights</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.insightsTable}>
              <thead>
                <tr>
                  <th>Retailer</th>
                  <th>Region</th>
                  <th>Total Releases</th>
                  <th>Active Releases</th>
                </tr>
              </thead>
              <tbody>
                {data.retailers.map((retailer) => (
                  <tr key={retailer.id}>
                    <td><strong>{retailer.name}</strong></td>
                    <td>{retailer.region || 'N/A'}</td>
                    <td>{retailer.releaseCount}</td>
                    <td className={styles.activeCount}>{retailer.activeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Retailers by Releases */}
        <div className={styles.section}>
          <h2>Top Retailers by Release Count</h2>
          <div className={styles.chartContainer}>
            {data.retailers
              .slice(0, 10)
              .map((retailer) => (
                <div key={retailer.id} className={styles.barItem}>
                  <div className={styles.barLabel}>{retailer.name}</div>
                  <div className={styles.barWrapper}>
                    <div className={`${styles.barFill} ${styles.retailerBar} ${getWidthClass((retailer.releaseCount / data.totalReleases) * 100)}`} />
                    <div className={styles.barValue}>{retailer.releaseCount}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {isAdmin && (
          <div className={styles.adminNote}>
            ℹ️ <strong>Admin View:</strong> You're seeing full analytics including user data. 
            Regular users see only their own alerts.
          </div>
        )}
      </main>
    </div>
  );
};

function getStatusClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'LIVE') return styles.statusLive;
  if (s === 'UPCOMING') return styles.statusUpcoming;
  if (s === 'SOLD OUT') return styles.statusSoldOut;
  if (s.includes('RAFFLE')) return styles.statusRaffle;
  return styles.statusDefault;
}

function getWidthClass(percent: number): string {
  const rounded = Math.max(0, Math.min(100, Math.round(percent / 5) * 5)); // snap to 5% increments
  return (styles as any)[`w${rounded}`] || (styles as any).w0;
}

export default AnalyticsPage;
