import { useEffect, useState } from 'react';

interface Subscription {
  brand_filter: string[];
  sku_filter: string[];
  region_filter: string[];
  size_filter: string[];
  discord_webhook?: string | null;
  slack_webhook?: string | null;
  custom_webhook?: string | null;
  max_events_hour?: number | null;
}

import styles from '../styles/Subscriptions.module.css';

export default function SubscriptionsPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Subscription>({
    brand_filter: [],
    sku_filter: [],
    region_filter: [],
    size_filter: [],
    discord_webhook: '',
    slack_webhook: '',
    custom_webhook: '',
    max_events_hour: 50,
  });

  async function fetchSub() {
    setLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE + '/subscriptions', {
        headers: { 'x-user-id': 'demo-user' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length) {
          setSub(data[0]);
          setForm({ ...form, ...data[0] });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveSub(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE + '/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const data = await res.json();
        setSub(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteSub() {
    setLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE + '/subscriptions', {
        method: 'DELETE',
        headers: { 'x-user-id': 'demo-user' }
      });
      if (res.ok) {
        setSub(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSub(); }, []);

  return (
    <div className={styles.container}>
      <h1>Subscription Preferences</h1>
      {loading && <p>Loading...</p>}
      <form onSubmit={saveSub} className={styles.form}>
        <label>
          Brands (comma-separated)
          <input
            value={form.brand_filter?.join(',')}
            onChange={e => setForm({ ...form, brand_filter: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          />
        </label>
        <label>
          SKUs (comma-separated)
          <input
            value={form.sku_filter?.join(',')}
            onChange={e => setForm({ ...form, sku_filter: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          />
        </label>
        <label>
          Regions (comma-separated)
          <input
            value={form.region_filter?.join(',')}
            onChange={e => setForm({ ...form, region_filter: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          />
        </label>
        <label>
          Sizes (comma-separated)
          <input
            value={form.size_filter?.join(',')}
            onChange={e => setForm({ ...form, size_filter: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          />
        </label>
        <label>
          Discord Webhook
          <input
            value={form.discord_webhook || ''}
            onChange={e => setForm({ ...form, discord_webhook: e.target.value })}
          />
        </label>
        <label>
          Slack Webhook
          <input
            value={form.slack_webhook || ''}
            onChange={e => setForm({ ...form, slack_webhook: e.target.value })}
          />
        </label>
        <label>
          Custom Webhook
          <input
            value={form.custom_webhook || ''}
            onChange={e => setForm({ ...form, custom_webhook: e.target.value })}
          />
        </label>
        <label>
          Max Events / Hour
          <input
            type="number"
            value={form.max_events_hour || 0}
            onChange={e => setForm({ ...form, max_events_hour: parseInt(e.target.value, 10) })}
          />
        </label>
        <button type="submit">Save Subscription</button>
        {sub && <button type="button" onClick={deleteSub}>Delete Subscription</button>}
      </form>
      {sub && (
        <div className={styles.currentBlock}>
          <h3>Current Saved Subscription</h3>
          <pre>{JSON.stringify(sub, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
