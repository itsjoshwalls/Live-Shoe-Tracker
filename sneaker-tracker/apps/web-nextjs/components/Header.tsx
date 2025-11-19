import React from 'react';
import { useAuth } from './AuthProvider';
import styles from './Header.module.css';

const Header: React.FC = () => {
    const { user, loading, isAdmin, signInWithGoogle, signOut } = useAuth();

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <div>
                    <h1 className={styles.title}>👟 Sneaker Tracker</h1>
                </div>
                
                <nav>
                    <ul className={styles.navList}>
                        <li><a href="/">Home</a></li>
                        <li><a href="/unified-dashboard">Dashboard</a></li>
                        <li><a href="/live-releases">Live</a></li>
                        <li><a href="/mileage">Mileage</a></li>
                        {user && <li><a href="/analytics">Analytics</a></li>}
                        {user && <li><a href="/alerts">Alerts</a></li>}
                        {isAdmin && <li><a href="/admin">Admin</a></li>}
                    </ul>
                </nav>
                
                <div className={styles.userRow}>
                    {loading ? (
                        <span>Loading...</span>
                    ) : user ? (
                        <>
                            <span>
                                {user.displayName || user.email}
                                {isAdmin && <span className={styles.adminBadge}>ADMIN</span>}
                            </span>
                            <button onClick={signOut} className={styles.signOutBtn}>
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={signInWithGoogle}
                            className={styles.signInBtn}
                        >
                            Sign in with Google
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;