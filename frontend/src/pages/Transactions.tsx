import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Plus, Upload, Search, Trash2, Pencil } from 'lucide-react';

export const Transactions: React.FC = () => {
  const { apiFetch } = useAuth();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<any[]>([]);

  // Helper helpers for current month dates (timezone-safe)
  const getFirstDayOfMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const getLastDayOfMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  };

  // Filter states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());

  // Add/Edit form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Groceries');
  const [txType, setTxType] = useState('EXPENSE');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [account, setAccount] = useState('HDFC Savings Account');
  const [notes, setNotes] = useState('');
  const [linkedInvestmentId, setLinkedInvestmentId] = useState('');

  // Import form states
  const [showImportForm, setShowImportForm] = useState(false);
  const [importFormat, setImportFormat] = useState('UPI_SMS');
  const [importRawData, setImportRawData] = useState('');

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(
        `/transactions?search=${search}&category=${category}&type=${type}&startDate=${startDate}&endDate=${endDate}`,
      );
      setTxs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [search, category, type, startDate, endDate]);

  useEffect(() => {
    apiFetch('/investments')
      .then(setInvestments)
      .catch((e) => console.error(e));
  }, []);

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAmount('');
    setTxCategory('Groceries');
    setTxType('EXPENSE');
    setPaymentMode('UPI');
    setAccount('HDFC Savings Account');
    setNotes('');
    setLinkedInvestmentId('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          description,
          category: txCategory,
          amount: parseFloat(amount),
          type: txType,
          paymentMode,
          account,
          notes,
          investmentId: txCategory === 'Investment' && linkedInvestmentId ? linkedInvestmentId : undefined,
        }),
      });
      setShowAddForm(false);
      resetForm();
      loadTransactions();
    } catch (err) {
      alert(err || 'Failed to create transaction');
    }
  };

  const openEdit = (tx: any) => {
    setEditingTx(tx);
    setDate(new Date(tx.date).toISOString().split('T')[0]);
    setDescription(tx.description);
    setAmount(String(tx.amount));
    setTxCategory(tx.category);
    setTxType(tx.type);
    setPaymentMode(tx.paymentMode);
    setAccount(tx.account || '');
    setNotes(tx.notes || '');
    setLinkedInvestmentId(tx.investmentId || '');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      await apiFetch(`/transactions/${editingTx.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          description,
          category: txCategory,
          amount: parseFloat(amount),
          type: txType,
          paymentMode,
          account,
          notes,
          investmentId: txCategory === 'Investment' && linkedInvestmentId ? linkedInvestmentId : null,
        }),
      });
      setEditingTx(null);
      resetForm();
      loadTransactions();
    } catch (err) {
      alert(err || 'Failed to update transaction');
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/transactions/import', {
        method: 'POST',
        body: JSON.stringify({
          rawData: importRawData,
          format: importFormat,
        }),
      });
      alert(`Imported ${res.importedCount} transactions. Skipped ${res.duplicatesSkipped} duplicates.`);
      setShowImportForm(false);
      setImportRawData('');
      loadTransactions();
    } catch (err) {
      alert(err || 'Import failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      loadTransactions();
    } catch (err) {
      alert(err || 'Failed to delete');
    }
  };

  return (
    <div className="flex-1 bg-[#0d0f14] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">Search, audit, and batch import statement logs.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowImportForm(true)}
            className="flex items-center space-x-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import Statement</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
          />
        </div>
        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white"
          >
            <option value="">All Categories</option>
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
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white"
          />
        </div>
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white"
          />
        </div>
        <button
          onClick={() => {
            setSearch('');
            setCategory('');
            setType('');
            setStartDate(getFirstDayOfMonth());
            setEndDate(getLastDayOfMonth());
          }}
          className="bg-gray-800/40 hover:bg-gray-800 hover:text-white text-gray-400 px-4 py-2 rounded-lg text-sm transition-all border border-gray-800"
        >
          Reset Filters
        </button>
      </div>

      {/* Filter Summary Bar */}
      {!loading && txs.length > 0 && (() => {
        const totalIncome  = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const net = totalIncome - totalExpense;
        const isFiltered = search || category || type;
        return (
          <div className={`flex flex-wrap items-center gap-3 mb-4 px-4 py-3 rounded-xl border text-sm ${
            isFiltered ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#161b22] border-gray-800'
          }`}>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mr-1">
              {isFiltered ? 'Filtered' : 'All'} · {txs.length} record{txs.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1" />
            {totalIncome > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-gray-500 text-xs">Income</span>
                <span className="font-bold text-emerald-400">
                  +₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {totalExpense > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-gray-500 text-xs">Expense</span>
                <span className="font-bold text-rose-400">
                  -₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {totalIncome > 0 && totalExpense > 0 && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-gray-700">
                <span className="text-gray-500 text-xs">Net</span>
                <span className={`font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Grid List */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-800/30 text-gray-400 border-b border-gray-850">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Account</th>
                <th className="py-3 px-4 font-semibold">Mode</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading records...
                  </td>
                </tr>
              ) : txs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No transactions found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                txs.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-850 hover:bg-gray-800/20 transition-all">
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(tx.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{tx.description}</td>
                    <td className="py-3 px-4">
                      <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full border border-gray-700">
                        {tx.category}
                      </span>
                      {tx.investmentId && (
                        <span className="ml-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30">
                          {investments.find((inv) => inv.id === tx.investmentId)?.name || 'Linked'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{tx.account}</td>
                    <td className="py-3 px-4 text-gray-400">{tx.paymentMode}</td>
                    <td className={`py-3 px-4 font-bold text-right ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openEdit(tx)}
                        className="text-gray-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="text-gray-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Record Modal */}
      {(showAddForm || editingTx) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">{editingTx ? 'Edit Financial Record' : 'Add Financial Record'}</h2>
            <form onSubmit={editingTx ? handleEditSave : handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Description / Merchant</label>
                <input
                  type="text"
                  placeholder="e.g., DMart Supermarket"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
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
              </div>

              {txCategory === 'Investment' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Link to Investment (optional)</label>
                  <select
                    value={linkedInvestmentId}
                    onChange={(e) => setLinkedInvestmentId(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">None</option>
                    {investments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                        {inv.isSip && inv.sipAmount ? ` (SIP ₹${Number(inv.sipAmount).toLocaleString('en-IN')}/mo)` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Linking this transaction will add its amount to the investment's principal automatically.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Account</label>
                  <input
                    type="text"
                    placeholder="e.g., HDFC Account"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-20 resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingTx(null);
                    resetForm();
                  }}
                  className="bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  {editingTx ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-2">Import Statement</h2>
            <p className="text-xs text-gray-400 mb-4">Paste standard banking text messages or upload raw CSV contents.</p>
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Format</label>
                <select
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="UPI_SMS">UPI Transaction SMS Texts (Multiple lines)</option>
                  <option value="CSV">Standard CSV Statement (date,description,category,amount,type,paymentMode,account)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Raw Text / CSV Data</label>
                <textarea
                  value={importRawData}
                  onChange={(e) => setImportRawData(e.target.value)}
                  placeholder={
                    importFormat === 'UPI_SMS'
                      ? 'Rs.1500 debited from HDFC AC 1234 to DMart Ref 998877\nSent Rs.500 to Swiggy on ICICI Bank AC XXXXX. Ref 123456'
                      : '2026-07-04,Swiggy Order,,1500,EXPENSE,UPI,HDFC Savings Account\n2026-07-03,Fuel,,3200,EXPENSE,UPI,ICICI Account'
                  }
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-48 resize-none font-mono"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportForm(false)}
                  className="bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Parse & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
