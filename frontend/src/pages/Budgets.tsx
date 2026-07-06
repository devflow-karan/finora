import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Plus, PiggyBank, Trash2 } from 'lucide-react';

export const Budgets: React.FC = () => {
  const { apiFetch } = useAuth();
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState('Groceries');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/budgets/performance');
      setPerformance(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/budgets', {
        method: 'POST',
        body: JSON.stringify({
          type: 'MONTHLY',
          category,
          amount: parseFloat(amount),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        }),
      });
      setShowAddForm(false);
      setAmount('');
      loadData();
    } catch (err) {
      alert(err || 'Failed to create budget');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err || 'Failed to delete');
    }
  };

  const totalBudgeted = performance.reduce((sum, item) => sum + item.budgeted, 0);
  const totalActual = performance.reduce((sum, item) => sum + item.actual, 0);
  const totalPercentage = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  return (
    <div className="flex-1 bg-[#0d0f14] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budget Planner</h1>
          <p className="text-gray-400 text-sm mt-1">Set spending thresholds and trace actual monthly consumption.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Set Budget Limit</span>
        </button>
      </div>

      {/* Aggregate card */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400">Total Monthly Allocation</h3>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold">₹{totalActual.toLocaleString('en-IN')}</span>
              <span className="text-xs text-gray-500">spent of ₹{totalBudgeted.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Overall Budget Usage</span>
            <span className="font-semibold">{totalPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                totalPercentage > 90 ? 'bg-rose-500' : totalPercentage > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, totalPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Budgets list */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading budget reports...</div>
      ) : performance.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-[#161b22] border border-gray-800 rounded-xl">
          No budgets configured for this period. Click 'Set Budget Limit' to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {performance.map((item) => (
            <div key={item.id} className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-white">{item.category}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">
                    Monthly
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <div>
                  <span className="text-xs text-gray-400">Spent</span>
                  <p className="font-bold text-white">₹{item.actual.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Limit</span>
                  <p className="font-semibold text-gray-300">₹{item.budgeted.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all ${
                    item.percentageUsed > 100 ? 'bg-rose-500' : item.percentageUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, item.percentageUsed)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={`${item.isOverSpent ? 'text-rose-400 font-semibold' : 'text-emerald-400'}`}>
                  {item.isOverSpent
                    ? `Exceeded by ₹${Math.abs(item.remaining).toLocaleString('en-IN')}`
                    : `₹${item.remaining.toLocaleString('en-IN')} remaining`}
                </span>
                <span className="text-gray-500">{item.percentageUsed.toFixed(0)}% used</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Set Budget Limit</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Food">Food</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Salary">Salary</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Monthly Limit (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
