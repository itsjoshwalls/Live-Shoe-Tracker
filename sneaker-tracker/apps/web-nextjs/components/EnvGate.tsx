import React from 'react';
import styles from './EnvGate.module.css';

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function hasFirebaseConfig() {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '';
  if (!raw) return false;
  try { JSON.parse(raw); return true; } catch { return false; }
}

export const EnvGate: React.FC<React.PropsWithChildren<{ requireFirebase?: boolean }>> = ({ children, requireFirebase = false }) => {
  const hasSupabase = hasSupabaseEnv();
  const hasFirebase = !requireFirebase || hasFirebaseConfig();

  if (hasSupabase && hasFirebase) return <>{children}</>;

  const needFirebase = requireFirebase && !hasFirebase;

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Configuration required</h1>
      {!hasSupabase && (
        <div className={styles.section}>
          <h2 className={styles.h2}>Supabase</h2>
          <p>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.</p>
          <pre className={styles.pre}>{`# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}</pre>
        </div>
      )}
      {needFirebase && (
        <div className={styles.section}>
          <h2 className={styles.h2}>Firebase (optional)</h2>
          <p>Provide <code>NEXT_PUBLIC_FIREBASE_CONFIG</code> as a single-line JSON string if Firebase features are used.</p>
          <pre className={styles.pre}>{`# .env.local
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}`}</pre>
        </div>
      )}
    </div>
  );
};
