import React from 'react';
import Header from '../components/Header';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

const Home: React.FC = () => {
  return (
    <div>
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>🔥 Welcome to Sneaker Tracker</h1>
          <p className={styles.heroSubtitle}>
            Your ultimate platform for tracking sneaker releases in real-time
          </p>
          <div className={styles.heroStats}>
            <div className={styles.statBadge}>
              <div className={styles.statNumber}>Live</div>
              <div className={styles.statLabel}>Real-Time Data</div>
            </div>
            <div className={styles.statBadge}>
              <div className={styles.statNumber}>∞</div>
              <div className={styles.statLabel}>Unlimited Tracking</div>
            </div>
            <div className={styles.statBadge}>
              <div className={styles.statNumber}>24/7</div>
              <div className={styles.statLabel}>Always Updated</div>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          <Link href="/unified-dashboard" className={`${styles.card} ${styles.cardPrimary}`}>
            <div className={styles.cardIcon}>📊</div>
            <h2>Unified Dashboard</h2>
            <p>Merge Firestore + Postgres into a single live view with advanced filters</p>
            <div className={styles.cardBadge}>Recommended</div>
          </Link>

          <Link href="/live-releases" className={styles.card}>
            <div className={styles.cardIcon}>🔴</div>
            <h2>Live Releases</h2>
            <p>Real-time sneaker releases from all scrapers with instant updates</p>
          </Link>

          <Link href="/dashboard" className={styles.card}>
            <div className={styles.cardIcon}>📈</div>
            <h2>Classic Dashboard</h2>
            <p>Product statuses, brands, retailers, and availability tracking</p>
          </Link>

          <Link href="/mileage" className={styles.card}>
            <div className={styles.cardIcon}>👟</div>
            <h2>Mileage Tracker</h2>
            <p>Track usage mileage for your sneakers and monitor wear</p>
          </Link>

          <Link href="/alerts" className={styles.card}>
            <div className={styles.cardIcon}>🔔</div>
            <h2>Alerts</h2>
            <p>Subscribe to product keywords and never miss a drop</p>
          </Link>

          <Link href="/analytics" className={styles.card}>
            <div className={styles.cardIcon}>📉</div>
            <h2>Analytics</h2>
            <p>Brand trends, active release counts, and retailer insights</p>
          </Link>
        </div>

        <div className={styles.features}>
          <h2 className={styles.featuresTitle}>Why Choose Sneaker Tracker?</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>⚡</div>
              <h3>Lightning Fast</h3>
              <p>Instant updates with real-time Firestore synchronization</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🎯</div>
              <h3>Precise Filters</h3>
              <p>Filter by brand, status, price, and more with URL-synced filters</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>💾</div>
              <h3>Smart Storage</h3>
              <p>Your filter preferences saved automatically across sessions</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📱</div>
              <h3>Mobile Ready</h3>
              <p>Responsive design works perfectly on any device</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;