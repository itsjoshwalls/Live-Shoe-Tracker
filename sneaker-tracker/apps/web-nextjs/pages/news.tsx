import React from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import styles from '../styles/news.module.css';

interface NewsItem {
  title: string;
  link: string;
  source: string;
  published_at: string;
  category: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnon ? createClient(supabaseUrl, supabaseAnon) : null;

export default function NewsPage() {
  const [items, setItems] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState<string>('ALL');

  React.useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase.from('news_articles').select('*').limit(200).order('published_at', { ascending: false });
      if (!active) return;
      let list = (data || []) as any[];
      if (category !== 'ALL') list = list.filter(r => r.category === category);
      setItems(list.map(r => ({
        title: r.title,
        link: r.link,
        source: r.source,
        published_at: r.published_at,
        category: r.category
      })));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [category]);

  return (
    <>
      <Head><title>Sneaker News | Sneaker Tracker</title></Head>
      <main className={styles['news-page']}>
        <h1 className={styles['news-title']}>Sneaker News</h1>
        <p className={styles['news-subtitle']}>Curated multi-source feed. Filter by category to focus your monitoring.</p>
        <div className={styles['category-filters']}>
          {['ALL','sneaker_news','streetwear','fashion','pop_culture','sneaker_culture'].map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`${styles['category-btn']} ${category === c ? styles.active : ''}`}
            >{c}</button>
          ))}
        </div>
        {loading && <div>Loading news…</div>}
        {!loading && items.length === 0 && <div>No news items found. Run `news_aggregator.py` to populate.</div>}
        <ul className={styles['news-list']}>
          {items.map((n, i) => (
            <li key={i} className={styles['news-item']}>
              <a href={n.link} target="_blank" rel="noreferrer" className={styles['news-link']}>{n.title}</a>
              <div className={styles['news-meta']}>
                {n.source} • {n.category} • {new Date(n.published_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}