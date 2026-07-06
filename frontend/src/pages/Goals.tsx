import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Plus, Target, Calendar, CheckCircle } from 'lucide-react';

export const Goals: React.FC = () => {
  const { apiFetch } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('EMERGENCY_FUND');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/goals');
      setGoals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/goals', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          targetAmount: parseFloat(targetAmount),
          currentAmount: parseFloat(currentAmount || '0'),
          expectedDate: new Date(expectedDate).toISOString(),
        }),
      });
      setShowAddForm(false);
      // Reset
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setExpectedDate('');
      loadGoals();
    } catch (err) {
      alert(err || 'Failed to create goal');
    }
  };

  return (
    <div className="flex-1 bg-[#0d0f14] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Goals</h1>
          <p className="text-gray-400 text-sm mt-1">Track wedding, home downpayment, child education, and emergency funds.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals list */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-[#161b22] border border-gray-800 rounded-xl">
          No financial goals recorded. Click 'New Goal' to establish one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g) => {
            const isCompleted = g.progressPercentage >= 100;
            return (
              <div key={g.id} className="bg-[#161b22] border border-gray-800 rounded-xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                {isCompleted && (
                  <div className="absolute top-2 right-2 text-emerald-400 flex items-center space-x-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25 text-[10px] font-bold">
                    <CheckCircle className="w-3 h-3" />
                    <span>Achieved</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-2.5 rounded-lg ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug">{g.name}</h3>
                      <span className="text-[10px] text-gray-400 tracking-wider uppercase">{g.type}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 mb-4">
                    <div>
                      <span>Saved Balance</span>
                      <p className="font-bold text-sm text-white mt-0.5">₹{g.totalAccumulated.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <span>Target Amount</span>
                      <p className="font-semibold text-sm text-gray-300 mt-0.5">₹{g.targetAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${g.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Target: {new Date(g.expectedDate).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })}</span>
                  </div>
                  <span className="font-bold text-gray-400">{g.progressPercentage}% complete</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Create Financial Goal</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g., Child Higher Education Fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Goal Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="EMERGENCY_FUND">Emergency Fund</option>
                    <option value="HOUSE">House Purchase</option>
                    <option value="CHILD_EDUCATION">Child Education</option>
                    <option value="TRAVEL">Travel / Vacation</option>
                    <option value="RETIREMENT">Retirement Fund</option>
                    <option value="VEHICLE">Vehicle Downpayment</option>
                    <option value="WEDDING">Wedding Planning</option>
                    <option value="CUSTOM">Custom Target</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Initial Cash Saving (₹)</label>
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="Optional base cash"
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
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
                  Add Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
