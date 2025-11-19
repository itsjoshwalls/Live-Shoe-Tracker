// Admin Page - Retailer Management (Complete with Modals & Accessibility Fixes)
// Path: sneaker-tracker/apps/web-nextjs/pages/admin/retailers.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  collection, getDocs, doc, updateDoc, deleteDoc, addDoc, 
  query, orderBy, where 
} from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useAuth } from '../../lib/auth';

interface Retailer {
  id: string;
  name: string;
  url: string;
  tier: string;
  type: string;
  region_group: string;
  country_code: string;
  verified: boolean;
  resale_market: boolean;
  has_raffles: boolean;
  raffle_url_pattern?: string;
  api_endpoint?: string;
  contact_email?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  notes?: string;
  source?: string;
  logo_url?: string;
  last_checked?: string;
}

interface AuditLog {
  id: string;
  action: string;
  user_email: string;
  retailer_id?: string;
  retailer_name?: string;
  changes?: any;
  timestamp: string;
}

export default function RetailersAdmin() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Check authentication and admin status
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, loading, router]);

  // Load retailers
  useEffect(() => {
    fetchRetailers();
    fetchAuditLogs();
  }, []);

  // Filter retailers
  useEffect(() => {
    let filtered = retailers;

    if (searchTerm) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterTier !== 'all') {
      filtered = filtered.filter((r) => r.tier === filterTier);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((r) => r.type === filterType);
    }

    if (filterRegion !== 'all') {
      filtered = filtered.filter((r) => r.region_group === filterRegion);
    }

    setFilteredRetailers(filtered);
  }, [retailers, searchTerm, filterTier, filterType, filterRegion]);

  const fetchRetailers = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'retailers'));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Retailer[];
      setRetailers(data);
    } catch (error) {
      console.error('Error fetching retailers:', error);
    }
    setIsLoading(false);
  };

  const fetchAuditLogs = async () => {
    try {
      const logsSnapshot = await getDocs(
        query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'))
      );
      const logs = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
      setAuditLogs(logs.slice(0, 100)); // Last 100 logs
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleDelete = async (retailerId: string) => {
    if (!confirm('Are you sure you want to delete this retailer?')) return;

    try {
      await deleteDoc(doc(db, 'retailers', retailerId));
      await logAudit('delete', retailerId);
      fetchRetailers();
    } catch (error) {
      console.error('Error deleting retailer:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedRetailers.length} retailers?`)) return;

    try {
      await Promise.all(
        selectedRetailers.map((id) => deleteDoc(doc(db, 'retailers', id)))
      );
      await logAudit('bulk_delete', undefined, {
        count: selectedRetailers.length,
      });
      setSelectedRetailers([]);
      fetchRetailers();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map((row) => row.split(','));
      const headers = rows[0].map((h) => h.trim());

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;

        const retailer: any = {};
        headers.forEach((header, index) => {
          retailer[header] = row[index]?.trim();
        });

        try {
          await addDoc(collection(db, 'retailers'), retailer);
        } catch (error) {
          console.error('Error adding retailer:', retailer, error);
        }
      }

      await logAudit('csv_upload', undefined, { rows: rows.length - 1 });
      fetchRetailers();
    };
    reader.readAsText(file);
  };

  const logAudit = async (action: string, retailerId?: string, changes?: any) => {
    try {
      const retailer = retailers.find((r) => r.id === retailerId);
      await addDoc(collection(db, 'audit_logs'), {
        action,
        user_email: user?.email || 'unknown',
        retailer_id: retailerId,
        retailer_name: retailer?.name,
        changes,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Audit log error:', err);
    }
  };

  const stats = {
    total: retailers.length,
    active: retailers.filter((r) => r.verified).length,
    withRaffles: retailers.filter((r) => r.has_raffles).length,
    resale: retailers.filter((r) => r.resale_market).length,
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Retailer Management</h1>
          <p className="text-gray-600 mt-2">
            Manage {retailers.length} retailers across all regions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Retailers</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Active/Verified</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.active}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">With Raffles</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.withRaffles}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Resale Markets</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{stats.resale}</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Retailer
            </button>

            <label className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
              📤 Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
                aria-label="Upload CSV file"
              />
            </label>

            {selectedRetailers.length > 0 && (
              <>
                <button
                  onClick={() => setShowBulkEditModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  ✏️ Bulk Edit ({selectedRetailers.length})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  🗑️ Delete ({selectedRetailers.length})
                </button>
              </>
            )}

            <button
              onClick={() => setShowAuditLog(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              📋 Audit Log
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search retailers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border rounded"
              aria-label="Search retailers"
            />

            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-4 py-2 border rounded"
              aria-label="Filter by tier"
            >
              <option value="all">All Tiers</option>
              <option value="tier_1">Tier 1</option>
              <option value="tier_2">Tier 2</option>
              <option value="tier_3">Tier 3</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded"
              aria-label="Filter by retailer type"
            >
              <option value="all">All Types</option>
              <option value="brand_official">Brand Official</option>
              <option value="chain">Chain</option>
              <option value="boutique">Boutique</option>
              <option value="skate_shop">Skate Shop</option>
              <option value="resale">Resale</option>
            </select>

            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-4 py-2 border rounded"
              aria-label="Filter by region"
            >
              <option value="all">All Regions</option>
              <option value="US">US</option>
              <option value="UK">UK</option>
              <option value="EU">EU</option>
              <option value="JP">JP</option>
              <option value="CA">CA</option>
              <option value="AU">AU</option>
            </select>
          </div>
        </div>

        {/* Retailers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRetailers.length === filteredRetailers.length && filteredRetailers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRetailers(filteredRetailers.map((r) => r.id));
                      } else {
                        setSelectedRetailers([]);
                      }
                    }}
                    aria-label="Select all retailers"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Features
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : filteredRetailers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No retailers found
                  </td>
                </tr>
              ) : (
                filteredRetailers.map((retailer) => (
                  <tr key={retailer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRetailers.includes(retailer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRetailers([...selectedRetailers, retailer.id]);
                          } else {
                            setSelectedRetailers(
                              selectedRetailers.filter((id) => id !== retailer.id)
                            );
                          }
                        }}
                        aria-label={`Select ${retailer.name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {retailer.logo_url && (
                          <img
                            src={retailer.logo_url}
                            alt={retailer.name}
                            className="h-8 w-8 rounded-full mr-3"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{retailer.name}</div>
                          <div className="text-sm text-gray-500">{retailer.country_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          retailer.tier === 'tier_1'
                            ? 'bg-yellow-100 text-yellow-800'
                            : retailer.tier === 'tier_2'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {retailer.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {retailer.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {retailer.region_group}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {retailer.verified && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Verified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {retailer.has_raffles && <span>🎟️</span>}
                        {retailer.api_endpoint && <span>🔌</span>}
                        {retailer.resale_market && <span>💰</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingRetailer(retailer);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(retailer.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddRetailerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchRetailers();
            setShowAddModal(false);
          }}
          logAudit={logAudit}
        />
      )}

      {showEditModal && editingRetailer && (
        <EditRetailerModal
          retailer={editingRetailer}
          onClose={() => {
            setShowEditModal(false);
            setEditingRetailer(null);
          }}
          onSuccess={() => {
            fetchRetailers();
            setShowEditModal(false);
            setEditingRetailer(null);
          }}
          logAudit={logAudit}
        />
      )}

      {showBulkEditModal && (
        <BulkEditModal
          selectedIds={selectedRetailers}
          onClose={() => setShowBulkEditModal(false)}
          onSuccess={() => {
            fetchRetailers();
            setShowBulkEditModal(false);
            setSelectedRetailers([]);
          }}
          logAudit={logAudit}
        />
      )}

      {showAuditLog && (
        <AuditLogModal
          logs={auditLogs}
          onClose={() => setShowAuditLog(false)}
        />
      )}
    </div>
  );
}

// ADD RETAILER MODAL
function AddRetailerModal({ onClose, onSuccess, logAudit }: any) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    tier: 'tier_2',
    type: 'boutique',
    region_group: 'US',
    country_code: 'US',
    verified: false,
    resale_market: false,
    has_raffles: false,
    contact_email: '',
    phone: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'retailers'), {
        ...formData,
        created_at: new Date().toISOString(),
      });
      await logAudit('create', docRef.id);
      onSuccess();
    } catch (error) {
      console.error('Error creating retailer:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Add New Retailer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="retailer-name">Name *</label>
            <input
              id="retailer-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              aria-label="Retailer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="retailer-url">URL *</label>
            <input
              id="retailer-url"
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              aria-label="Retailer URL"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="retailer-tier">Tier</label>
              <select
                id="retailer-tier"
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border rounded-md"
                aria-label="Retailer tier"
              >
                <option value="tier_1">Tier 1</option>
                <option value="tier_2">Tier 2</option>
                <option value="tier_3">Tier 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="retailer-type">Type</label>
              <select
                id="retailer-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border rounded-md"
                aria-label="Retailer type"
              >
                <option value="brand_official">Brand Official</option>
                <option value="chain">Chain</option>
                <option value="boutique">Boutique</option>
                <option value="skate_shop">Skate Shop</option>
                <option value="resale">Resale</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="retailer-region">Region</label>
              <select
                id="retailer-region"
                value={formData.region_group}
                onChange={(e) => setFormData({ ...formData, region_group: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border rounded-md"
                aria-label="Retailer region"
              >
                <option value="US">US</option>
                <option value="UK">UK</option>
                <option value="EU">EU</option>
                <option value="JP">JP</option>
                <option value="CA">CA</option>
                <option value="AU">AU</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="retailer-country-code">Country Code</label>
              <input
                id="retailer-country-code"
                type="text"
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border rounded-md"
                aria-label="Country code"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.verified}
                onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                className="mr-2"
                aria-label="Mark as verified"
              />
              <span className="text-sm font-medium text-gray-700">Verified</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.has_raffles}
                onChange={(e) => setFormData({ ...formData, has_raffles: e.target.checked })}
                className="mr-2"
                aria-label="Has raffles"
              />
              <span className="text-sm font-medium text-gray-700">Has Raffles</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.resale_market}
                onChange={(e) => setFormData({ ...formData, resale_market: e.target.checked })}
                className="mr-2"
                aria-label="Is resale market"
              />
              <span className="text-sm font-medium text-gray-700">Resale Market</span>
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Retailer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// EDIT RETAILER MODAL
function EditRetailerModal({ retailer, onClose, onSuccess, logAudit }: any) {
  const [formData, setFormData] = useState(retailer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'retailers', retailer.id), {
        ...formData,
        updated_at: new Date().toISOString(),
      });
      await logAudit('update', retailer.id, formData);
      onSuccess();
    } catch (error) {
      console.error('Error updating retailer:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Edit Retailer: {retailer.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="edit-name">Name *</label>
            <input
              id="edit-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              aria-label="Edit retailer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="edit-url">URL *</label>
            <input
              id="edit-url"
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              aria-label="Edit retailer URL"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="edit-tier">Tier</label>
              <select
                id="edit-tier"
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border rounded-md"
                aria-label="Edit tier"
              >
                <option value="tier_1">Tier 1</option>
                <option value="tier_2">Tier 2</option>
                <option value="tier_3">Tier 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="edit-type">Type</label>
              <select
                id="edit-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border rounded-md"
                aria-label="Edit type"
              >
                <option value="brand_official">Brand Official</option>
                <option value="chain">Chain</option>
                <option value="boutique">Boutique</option>
                <option value="skate_shop">Skate Shop</option>
                <option value="resale">Resale</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.verified}
                onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Verified</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.has_raffles}
                onChange={(e) => setFormData({ ...formData, has_raffles: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Has Raffles</span>
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// BULK EDIT MODAL
function BulkEditModal({ selectedIds, onClose, onSuccess, logAudit }: any) {
  const [updates, setUpdates] = useState({
    tier: '',
    verified: false,
    has_raffles: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const batch = selectedIds.map((id: string) =>
        updateDoc(doc(db, 'retailers', id), {
          ...updates,
          updated_at: new Date().toISOString(),
        })
      );
      await Promise.all(batch);
      await logAudit('bulk_update', undefined, { count: selectedIds.length, updates });
      onSuccess();
    } catch (error) {
      console.error('Error bulk updating:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-6">
          Bulk Edit {selectedIds.length} Retailers
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="bulk-tier">Change Tier</label>
            <select
              id="bulk-tier"
              value={updates.tier}
              onChange={(e) => setUpdates({ ...updates, tier: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              aria-label="Bulk change tier"
            >
              <option value="">-- No Change --</option>
              <option value="tier_1">Tier 1</option>
              <option value="tier_2">Tier 2</option>
              <option value="tier_3">Tier 3</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={updates.verified}
                onChange={(e) => setUpdates({ ...updates, verified: e.target.checked })}
                className="mr-2"
                aria-label="Bulk mark as verified"
              />
              <span className="text-sm font-medium text-gray-700">Mark as Verified</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={updates.has_raffles}
                onChange={(e) => setUpdates({ ...updates, has_raffles: e.target.checked })}
                className="mr-2"
                aria-label="Bulk enable raffles"
              />
              <span className="text-sm font-medium text-gray-700">Enable Raffles</span>
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Apply to {selectedIds.length} Retailers
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// AUDIT LOG MODAL
function AuditLogModal({ logs, onClose }: { logs: AuditLog[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Audit Log (Last 100 Actions)</h2>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-gray-900">{log.action}</span>
                  {log.retailer_name && (
                    <span className="text-gray-600"> - {log.retailer_name}</span>
                  )}
                  <div className="text-sm text-gray-500 mt-1">
                    by {log.user_email} at {new Date(log.timestamp).toLocaleString()}
                  </div>
                  {log.changes && (
                    <div className="text-xs text-gray-400 mt-1">
                      {JSON.stringify(log.changes)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}
