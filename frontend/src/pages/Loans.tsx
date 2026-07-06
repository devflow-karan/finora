import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Plus, Sparkles, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function calcOutstanding(
  principal: number,
  emi: number,
  startDate: string,
  interestRate: number = 0,
  interestType: string = 'COMPOUND',
): number {
  if (!principal || !emi || !startDate) return principal || 0;

  const start = new Date(startDate);
  const now = new Date();
  const n = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
  );

  if (n === 0) return principal;

  // Interest-free loan (family loans, etc.) — simple principal reduction
  if (!interestRate || interestType === 'SIMPLE' || interestRate === 0) {
    return Math.max(0, principal - emi * n);
  }

  // Reducing balance (compound) — standard bank EMI formula
  // Outstanding = P(1+r)^n − EMI × [(1+r)^n − 1] / r
  const r = interestRate / 100 / 12; // monthly rate
  const factor = Math.pow(1 + r, n);
  const outstanding = principal * factor - emi * ((factor - 1) / r);
  return Math.max(0, Math.round(outstanding));
}

const emptyForm = {
  name: '', lender: '', principal: '', interestRate: '',
  interestType: 'COMPOUND', emi: '', startDate: '', endDate: '', loanType: 'INTEREST_BEARING',
  outstandingOverride: '',
};

export const Loans: React.FC = () => {
  const { apiFetch } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [amortization, setAmortization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add / Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Extra payment form
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payDesc, setPayDesc] = useState('');

  // Computed outstanding preview
  const outstandingPreview = calcOutstanding(
    parseFloat(form.principal) || 0,
    parseFloat(form.emi) || 0,
    form.startDate,
    parseFloat(form.interestRate) || 0,
    form.interestType,
  );

  const loadLoans = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/loans');
      setLoans(data);
      if (data.length > 0 && !selectedLoanId) setSelectedLoanId(data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAmortization = async (id: string) => {
    try {
      const data = await apiFetch(`/loans/${id}/amortization`);
      setAmortization(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadLoans(); }, []);
  useEffect(() => {
    if (selectedLoanId) loadAmortization(selectedLoanId);
    else setAmortization(null);
  }, [selectedLoanId]);

  const openAdd = () => {
    setEditingLoan(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (loan: any) => {
    setEditingLoan(loan);
    setForm({
      name: loan.name,
      lender: loan.lender,
      principal: String(loan.principal),
      interestRate: String(loan.interestRate),
      interestType: loan.interestType,
      emi: String(loan.emi),
      startDate: loan.startDate?.split('T')[0] || '',
      endDate: loan.endDate?.split('T')[0] || '',
      loanType: loan.type,
      outstandingOverride: String(loan.outstanding),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use manual override if provided, otherwise auto-calculate
    const outstanding = form.outstandingOverride
      ? parseFloat(form.outstandingOverride)
      : calcOutstanding(
          parseFloat(form.principal),
          parseFloat(form.emi),
          form.startDate,
          parseFloat(form.interestRate) || 0,
          form.interestType,
        );
    const payload = {
      name: form.name,
      lender: form.lender,
      principal: parseFloat(form.principal),
      interestRate: parseFloat(form.interestRate),
      interestType: form.interestType,
      emi: parseFloat(form.emi),
      outstanding,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      type: form.loanType,
    };
    try {
      if (editingLoan) {
        await apiFetch(`/loans/${editingLoan.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const res = await apiFetch('/loans', { method: 'POST', body: JSON.stringify(payload) });
        setSelectedLoanId(res.id);
      }
      setShowForm(false);
      loadLoans();
    } catch (err) {
      alert(err || 'Failed to save loan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this loan record?')) return;
    try {
      await apiFetch(`/loans/${id}`, { method: 'DELETE' });
      if (selectedLoanId === id) setSelectedLoanId(null);
      loadLoans();
    } catch (err) {
      alert('Failed to delete loan');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) return;
    try {
      await apiFetch(`/loans/${selectedLoanId}/extra-payment`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(payAmount), date: new Date(payDate).toISOString(), description: payDesc }),
      });
      setShowPayForm(false);
      setPayAmount(''); setPayDesc('');
      loadLoans();
      loadAmortization(selectedLoanId);
    } catch (err) {
      alert('Prepayment failed');
    }
  };



  return (
    <div className="flex-1 bg-[#0d0f14] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan & Debt Management</h1>
          <p className="text-gray-400 text-sm mt-1">Track EMIs, amortization curves, and run payoff forecasts.</p>
        </div>
        <button onClick={openAdd} className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm transition-all shadow-md">
          <Plus className="w-4 h-4" />
          <span>Add Loan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: loan list */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Borrowings</h2>
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading loans...</div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-[#161b22] border border-gray-800 rounded-xl text-sm">
              No active loans recorded.
            </div>
          ) : (
            loans.map((loan) => {
              const pct = Math.max(0, Math.min(100, ((loan.principal - loan.outstanding) / loan.principal) * 100));
              const isSelected = selectedLoanId === loan.id;
              return (
                <div
                  key={loan.id}
                  onClick={() => setSelectedLoanId(loan.id)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-emerald-500/5 border-emerald-500/35' : 'bg-[#161b22] border-gray-800 hover:border-gray-700'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white truncate pr-2 text-sm">{loan.name}</span>
                    <div className="flex items-center space-x-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(loan)}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-all"
                        title="Edit loan"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(loan.id)}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-all"
                        title="Delete loan"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>Outstanding: ₹{loan.outstanding.toLocaleString('en-IN')}</span>
                    <span>{loan.interestRate}% · ₹{loan.emi.toLocaleString('en-IN')}/mo</span>
                  </div>

                  <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{pct.toFixed(0)}% Repaid</span>
                </div>
              );
            })
          )}
        </div>

        {/* Right: amortization chart */}
        <div className="lg:col-span-2 space-y-6">
          {amortization ? (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-5 flex items-start space-x-3 text-emerald-300">
                <Sparkles className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold">Extra Payment Payoff Optimization</h3>
                  <p className="text-xs mt-1.5 leading-relaxed">
                    Extra prepayments saved{' '}
                    <strong className="text-white">₹{amortization.metrics.interestSaved.toLocaleString('en-IN')}</strong>{' '}
                    in total interest and will close the loan{' '}
                    <strong className="text-white">{amortization.metrics.monthsSaved} months</strong> earlier!
                  </p>
                  <button
                    onClick={() => setShowPayForm(true)}
                    className="mt-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-all flex items-center space-x-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Log Prepayment</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Outstanding Balance Projection</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={amortization.schedule.filter((_: any, i: number) => i % 6 === 0 || i === amortization.schedule.length - 1)}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                      <XAxis dataKey="month" stroke="#8b949e" fontSize={10} />
                      <YAxis stroke="#8b949e" fontSize={10} />
                      <Tooltip formatter={(value) => value ? `₹${Number(value).toLocaleString('en-IN')}` : ''} />
                      <Area type="monotone" dataKey="remainingBalance" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBalance)" name="Balance" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 bg-[#161b22] border border-gray-800 rounded-xl text-gray-500 text-sm">
              Select an active loan to view forecast curves.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Loan Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">{editingLoan ? 'Edit Loan' : 'Record New Loan'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Loan Name</label>
                  <input type="text" placeholder="e.g., SBI Home Loan" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Lender</label>
                  <input type="text" placeholder="e.g., SBI" value={form.lender}
                    onChange={(e) => setForm({ ...form, lender: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Loan Amount / Principal (₹)</label>
                  <input type="number" placeholder="e.g., 5000000" value={form.principal}
                    onChange={(e) => setForm({ ...form, principal: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Monthly EMI (₹)</label>
                  <input type="number" placeholder="e.g., 39000" value={form.emi}
                    onChange={(e) => setForm({ ...form, emi: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Interest Rate (%)</label>
                  <input type="number" step="0.01" placeholder="e.g., 8.5" value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Loan Category</label>
                  <select value={form.loanType} onChange={(e) => setForm({ ...form, loanType: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                    <option value="INTEREST_BEARING">Interest Bearing</option>
                    <option value="INTEREST_FREE">Interest Free (e.g. Family)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                  <input type="date" value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Date</label>
                  <input type="date" value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
              </div>

              {/* Outstanding override + auto-calc preview */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Current Outstanding (₹) <span className="text-gray-600">— enter from bank statement for accuracy</span>
                </label>
                <input
                  type="number"
                  placeholder="Leave blank to auto-calculate"
                  value={form.outstandingOverride}
                  onChange={(e) => setForm({ ...form, outstandingOverride: e.target.value })}
                  className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              {form.principal && form.emi && form.startDate && (
                <div className={`rounded-lg px-4 py-3 flex items-center justify-between border ${
                  form.outstandingOverride
                    ? 'bg-emerald-500/10 border-emerald-500/25'
                    : 'bg-blue-500/10 border-blue-500/25'
                }`}>
                  <span className={`text-xs ${form.outstandingOverride ? 'text-emerald-300' : 'text-blue-300'}`}>
                    {form.outstandingOverride ? '✓ Using your bank figure' : 'Auto-calculated estimate (may differ from bank)'}
                  </span>
                  <span className="text-sm font-bold text-white">
                    ₹{(form.outstandingOverride ? parseFloat(form.outstandingOverride) : outstandingPreview).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm transition-all">
                  {editingLoan ? 'Save Changes' : 'Add Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extra Payment Modal */}
      {showPayForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Log Loan Prepayment</h2>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Prepayment Amount (₹)</label>
                <input type="number" placeholder="e.g., 50000" value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Payment Date</label>
                <input type="date" value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description / Source</label>
                <input type="text" placeholder="e.g., Year-end Bonus, Tax Refund" value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowPayForm(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm transition-all">
                  Apply Prepayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
