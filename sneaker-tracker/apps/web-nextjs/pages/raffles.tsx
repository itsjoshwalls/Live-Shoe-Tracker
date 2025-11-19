import React from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import styles from '../styles/raffles.module.css';

interface RaffleEntry {
  name: string;
  store: string;
  deadline: string;
  raffle_url: string;
  region: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnon ? createClient(supabaseUrl, supabaseAnon) : null;

export default function RafflesPage() {
  const [raffles, setRaffles] = React.useState<RaffleEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [region, setRegion] = React.useState<string>('ALL');

  React.useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const query = supabase.from('raffles').select('*').limit(200).order('deadline', { ascending: true });
      const { data } = await query;
      if (!active) return;
      let list = (data || []) as any[];
      if (region !== 'ALL') list = list.filter(r => r.region === region);
      setRaffles(list.map(r => ({
        name: r.name,
        store: r.store,
        deadline: r.deadline,
        raffle_url: r.raffle_url,
        region: r.region
      })));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [region]);

  return (
    <>
      <Head>
        <title>Raffle Calendar | Sneaker Tracker</title>
      </Head>
      <main className={styles['raffles-page']}>
        <h1 className={styles['raffles-title']}>Raffle Calendar</h1>
        <p className={styles['raffles-subtitle']}>Global raffle feed (aggregated). Filter by region and view deadlines in local time.</p>
        <div className={styles['region-filters']}>
          {['ALL','US','EU','UK','Asia','Global'].map(r => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`${styles['region-btn']} ${region === r ? styles.active : ''}`}
            >{r}</button>
          ))}
        </div>
        {loading && <div>Loading raffles…</div>}
        {!loading && raffles.length === 0 && <div>No raffles found (check data ingestion or region filter).</div>}
        <table className={styles['raffles-table']}>
          <thead>
            <tr>
              <th>Sneaker</th>
              <th>Store</th>
              <th>Region</th>
              <th>Deadline</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {raffles.map((r, i) => (
              <tr key={i}>
                <td className={styles['sneaker-name']}>{r.name}</td>
                <td>{r.store}</td>
                <td>{r.region}</td>
                <td>{r.deadline ? new Date(r.deadline).toLocaleString() : '—'}</td>
                <td>
                  {r.raffle_url && <a href={r.raffle_url} target="_blank" rel="noreferrer" className={styles['raffle-link']}>Enter →</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}