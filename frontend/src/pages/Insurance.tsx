import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Plus, Heart, Calendar, AlertCircle, Pencil, Trash2, Download } from 'lucide-react';

const emptyForm = {
  policyName: '', policyNumber: '', type: 'LIFE', premium: '',
  premiumFrequency: 'YEARLY', renewalDate: '', nominee: '', coverage: '',
};

export const Insurance: React.FC = () => {
  const { apiFetch, accessToken } = useAuth();
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/insurance');
      setPolicies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleDownloadCsv = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/insurance/export`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export insurance CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insurance_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download CSV');
    }
  };

  const openAdd = () => {
    setEditingPolicy(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (policy: any) => {
    setEditingPolicy(policy);
    setForm({
      policyName: policy.policyName,
      policyNumber: policy.policyNumber,
      type: policy.type,
      premium: String(policy.premium),
      premiumFrequency: policy.premiumFrequency || 'YEARLY',
      renewalDate: policy.renewalDate?.split('T')[0] || '',
      nominee: policy.nominee || '',
      coverage: String(policy.coverage),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      policyName: form.policyName,
      policyNumber: form.policyNumber,
      type: form.type,
      premium: parseFloat(form.premium),
      premiumFrequency: form.premiumFrequency,
      renewalDate: new Date(form.renewalDate).toISOString(),
      nominee: form.nominee || null,
      coverage: parseFloat(form.coverage),
      status: 'ACTIVE',
    };

    try {
      if (editingPolicy) {
        await apiFetch(`/insurance/${editingPolicy.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/insurance', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      loadPolicies();
    } catch (err) {
      alert(err || 'Failed to save policy');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this insurance policy record?')) return;
    try {
      await apiFetch(`/insurance/${id}`, { method: 'DELETE' });
      loadPolicies();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const getMonthlyEquivalent = (prem: number, freq: string) => {
    switch (freq) {
      case 'MONTHLY': return prem;
      case 'QUARTERLY': return prem / 3;
      case 'HALF_YEARLY': return prem / 6;
      case 'YEARLY':
      default:
        return prem / 12;
    }
  };

  const totalCoverage = policies
    .filter((p) => p.status === 'ACTIVE')
    .reduce((sum, p) => sum + p.coverage, 0);

  const totalMonthlyPremiumBudget = policies
    .filter((p) => p.status === 'ACTIVE')
    .reduce((sum, p) => sum + getMonthlyEquivalent(p.premium, p.premiumFrequency || 'YEARLY'), 0);

  const activePolicies = policies.filter((p) => p.status === 'ACTIVE');
  const upcomingRenewals = [...activePolicies].sort(
    (a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()
  );

  return (
    <div className="flex-1 bg-[#0d0f14] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insurance Portfolio & Renewals</h1>
          <p className="text-gray-400 text-sm mt-1">Manage cycles, premium cash flows, and renewal dates.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center space-x-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Record Policy</span>
          </button>
        </div>
      </div>

      {/* Aggregate cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400">Total Active Cover</h3>
              <p className="text-2xl font-bold mt-1">₹{totalCoverage.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400">Monthly Premium Reserve Equivalent</h3>
              <p className="text-2xl font-bold mt-1">₹{Math.round(totalMonthlyPremiumBudget).toLocaleString('en-IN')}/mo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Planner */}
      {activePolicies.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2 mb-3">
            <AlertCircle className="w-4 h-4" />
            <span>Upcoming Premium Timeline</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingRenewals.slice(0, 3).map((p) => {
              const daysLeft = Math.ceil(
                (new Date(p.renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div key={p.id} className="bg-[#0d0f14] border border-gray-800 rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-semibold uppercase">{p.type}</span>
                    <h4 className="font-bold text-white text-sm mt-0.5 truncate">{p.policyName}</h4>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-medium">
                      {daysLeft <= 0 ? 'Due today' : `In ${daysLeft} days`}
                    </span>
                    <span className="text-xs font-bold text-white">
                      ₹{p.premium.toLocaleString('en-IN')} ({p.premiumFrequency || 'YEARLY'})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Policies list */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading policies...</div>
      ) : policies.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-[#161b22] border border-gray-800 rounded-xl">
          No policies recorded.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {policies.map((p) => (
            <div key={p.id} className="bg-[#161b22] border border-gray-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700 font-semibold uppercase">
                    {p.type}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1 rounded bg-[#0d0f14] border border-gray-805 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-all"
                      title="Edit Policy"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 rounded bg-[#0d0f14] border border-gray-805 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-all"
                      title="Delete Policy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className={`text-[10px] flex items-center font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-white text-base leading-tight mb-1">{p.policyName}</h3>
                <span className="text-xs text-gray-400">No: {p.policyNumber}</span>

                <div className="mt-4 space-y-2 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Coverage</span>
                    <span className="text-white font-semibold">₹{p.coverage.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium Cost</span>
                    <span className="text-white font-semibold">
                      ₹{p.premium.toLocaleString('en-IN')} ({p.premiumFrequency || 'YEARLY'})
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-blue-400">
                    <span>Monthly equivalent</span>
                    <span>₹{Math.round(getMonthlyEquivalent(p.premium, p.premiumFrequency || 'YEARLY')).toLocaleString('en-IN')}/mo</span>
                  </div>
                  {p.nominee && (
                    <div className="flex justify-between">
                      <span>Nominee</span>
                      <span className="text-white">{p.nominee}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-850 flex items-center space-x-2 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Renew: {new Date(p.renewalDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Policy Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">{editingPolicy ? 'Edit Policy' : 'Record Policy'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Policy Provider & Name</label>
                <input
                  type="text"
                  placeholder="e.g., Niva Bupa Health Optima"
                  value={form.policyName}
                  onChange={(e) => setForm({ ...form, policyName: e.target.value })}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Policy Number</label>
                  <input
                    type="text"
                    placeholder="e.g., HI-123456"
                    value={form.policyNumber}
                    onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Policy Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LIFE">Life Insurance</option>
                    <option value="HEALTH">Health Insurance</option>
                    <option value="VEHICLE">Vehicle Insurance</option>
                    <option value="HOME">Home Insurance</option>
                    <option value="PARENTS">Parents Health Ins.</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Premium Amount (₹)</label>
                  <input
                    type="number"
                    value={form.premium}
                    onChange={(e) => setForm({ ...form, premium: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Premium Frequency</label>
                  <select
                    value={form.premiumFrequency}
                    onChange={(e) => setForm({ ...form, premiumFrequency: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Coverage / Sum Assured (₹)</label>
                  <input
                    type="number"
                    value={form.coverage}
                    onChange={(e) => setForm({ ...form, coverage: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Renewal Date</label>
                  <input
                    type="date"
                    value={form.renewalDate}
                    onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Nominee</label>
                <input
                  type="text"
                  placeholder="Nominee name"
                  value={form.nominee}
                  onChange={(e) => setForm({ ...form, nominee: e.target.value })}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  {editingPolicy ? 'Save Changes' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
