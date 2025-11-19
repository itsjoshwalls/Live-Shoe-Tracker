/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from '../lib/firebaseClient';
import { useAuth } from '../components/AuthProvider';
import Header from '../components/Header';

interface Alert {
  key: string;
  brand?: string;
  keywords?: string[];
  notifyMethods?: string[];
  createdAt?: any;
}

const AlertsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [alertKey, setAlertKey] = useState('');
  const [brand, setBrand] = useState('');
  const [keywords, setKeywords] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    fetchAlerts();
  }, [user, authLoading]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const functions = getFunctionsInstance();
      const getMyAlerts = httpsCallable(functions, 'getMyAlerts');
      const result: any = await getMyAlerts();
      
      setAlerts(result.data?.alerts || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertKey || !brand) {
      alert('Please fill in alert key and brand');
      return;
    }

    try {
      setSubmitting(true);
      const functions = getFunctionsInstance();
      const subscribeAlert = httpsCallable(functions, 'subscribeAlert');
      
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      
      await subscribeAlert({
        alertData: {
          key: alertKey,
          brand,
          keywords: keywordArray,
          notifyMethods: ['email']
        }
      });

      // Reset form
      setAlertKey('');
      setBrand('');
      setKeywords('');
      
      // Refresh alerts
      await fetchAlerts();
      alert('✅ Alert subscribed successfully!');
    } catch (err: any) {
      console.error('Error subscribing:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsubscribe = async (key: string) => {
    if (!confirm(`Unsubscribe from alert "${key}"?`)) return;

    try {
      const functions = getFunctionsInstance();
      const unsubscribeAlert = httpsCallable(functions, 'unsubscribeAlert');
      await unsubscribeAlert({ alertKey: key });
      
      await fetchAlerts();
      alert('✅ Unsubscribed successfully!');
    } catch (err: any) {
      console.error('Error unsubscribing:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  if (authLoading) {
    return (
      <div>
        <Header />
        <div className="container">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Header />
        <div className="container">
          <h1>My Alerts</h1>
          <p>Please sign in to manage your alerts.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container">
        <h1>My Alerts</h1>
        <p className="subtitle">Get notified when releases match your criteria</p>

        {/* Subscribe Form */}
        <div className="alert-form">
          <h2>Subscribe to New Alert</h2>
          <form onSubmit={handleSubscribe}>
            <div className="form-group">
              <label htmlFor="alertKey">Alert Key (unique identifier)</label>
              <input
                id="alertKey"
                type="text"
                value={alertKey}
                onChange={(e) => setAlertKey(e.target.value)}
                placeholder="e.g., aj4-bred"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="brand">Brand</label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Jordan, Nike, Adidas"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="keywords">Keywords (comma-separated)</label>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., bred, jordan 4, retro"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Subscribing...' : 'Subscribe to Alert'}
            </button>
          </form>
        </div>

        {/* Active Alerts List */}
        <div className="alerts-list">
          <h2>Active Alerts ({alerts.length})</h2>
          
          {loading ? (
            <p>Loading your alerts...</p>
          ) : error ? (
            <p className="error">Error: {error}</p>
          ) : alerts.length === 0 ? (
            <p>No active alerts. Subscribe to your first alert above!</p>
          ) : (
            <div className="alerts-grid">
              {alerts.map((alert) => (
                <div key={alert.key} className="alert-card">
                  <div className="alert-header">
                    <h3>{alert.key}</h3>
                    <button
                      onClick={() => handleUnsubscribe(alert.key)}
                      className="btn-danger-small"
                    >
                      Unsubscribe
                    </button>
                  </div>
                  
                  {alert.brand && (
                    <div className="alert-detail">
                      <strong>Brand:</strong> {alert.brand}
                    </div>
                  )}
                  
                  {alert.keywords && alert.keywords.length > 0 && (
                    <div className="alert-detail">
                      <strong>Keywords:</strong> {alert.keywords.join(', ')}
                    </div>
                  )}
                  
                  {alert.notifyMethods && alert.notifyMethods.length > 0 && (
                    <div className="alert-detail">
                      <strong>Notifications:</strong> {alert.notifyMethods.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .subtitle {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .alert-form {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .alert-form h2 {
          margin-top: 0;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2563eb;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alerts-list {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 2rem;
        }

        .alerts-list h2 {
          margin-top: 0;
        }

        .alerts-grid {
          display: grid;
          gap: 1rem;
        }

        .alert-card {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 1.5rem;
          background: #f9fafb;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .alert-header h3 {
          margin: 0;
          color: #1f2937;
        }

        .btn-danger-small {
          background-color: #ef4444;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .btn-danger-small:hover {
          background-color: #dc2626;
        }

        .alert-detail {
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: #4b5563;
        }

        .error {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default AlertsPage;
