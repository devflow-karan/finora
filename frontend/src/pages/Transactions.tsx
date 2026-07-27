import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Plus, Upload, Download, Search, Trash2, Pencil, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

interface PaginatedTransactions {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function parseTransactionsResponse(
  response: unknown,
  page: number,
  pageSize: number,
): PaginatedTransactions {
  if (Array.isArray(response)) {
    const total = response.length;
    const start = (page - 1) * pageSize;
    return {
      data: response.slice(start, start + pageSize),
      total,
      page,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray((response as PaginatedTransactions).data)
  ) {
    const paginated = response as PaginatedTransactions;
    return {
      data: paginated.data,
      total: paginated.total ?? paginated.data.length,
      page: paginated.page ?? page,
      limit: paginated.limit ?? pageSize,
      totalPages: paginated.totalPages ?? Math.max(1, Math.ceil((paginated.total ?? paginated.data.length) / pageSize)),
    };
  }

  throw new Error('Unexpected API response — expected a paginated list of transactions');
}

export const Transactions: React.FC = () => {
  const { apiFetch, accessToken } = useAuth();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  // Account states
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountFilter, setAccountFilter] = useState('');
  const [showNewAccountInput, setShowNewAccountInput] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [editingAccountBalances, setEditingAccountBalances] = useState<{ [id: string]: number }>({});


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

  const buildTransactionsQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (type) params.set('type', type);
    if (accountFilter) params.set('account', accountFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    return `/transactions?${params.toString()}`;
  }, [search, category, type, accountFilter, startDate, endDate, page, pageSize]);


  const isDateInFilterRange = (txDate: string) => {
    const d = txDate.split('T')[0];
    return d >= startDate && d <= endDate;
  };

  const notifyIfOutsideFilter = (txDate: string, action: string) => {
    if (!isDateInFilterRange(txDate)) {
      alert(
        `Record ${action}, but its date (${txDate}) is outside the current filter (${startDate} to ${endDate}). Widen the date range to view it.`,
      );
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(buildTransactionsQuery());
      const paginated = parseTransactionsResponse(response, page, pageSize);
      setTxs(paginated.data);
      setTotal(paginated.total);
      setTotalPages(paginated.totalPages);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load transactions';
      setError(message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = () => {
    apiFetch('/accounts')
      .then((data) => {
        setAccounts(data);
        if (data.length > 0 && !account) {
          setAccount(data[0].name);
        }
      })
      .catch((e) => console.error(e));
  };

  useEffect(() => {
    loadTransactions();
  }, [search, category, type, accountFilter, startDate, endDate, page, pageSize]);

  useEffect(() => {
    loadAccounts();
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
    setAccount(accounts[0]?.name || 'HDFC Savings Account');
    setNotes('');
    setLinkedInvestmentId('');
    setShowNewAccountInput(false);
    setNewAccountName('');
  };


  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const actualAccount = showNewAccountInput ? newAccountName : account;
      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          description,
          category: txCategory,
          amount: parseFloat(amount),
          type: txType,
          paymentMode,
          account: actualAccount,
          notes,
          investmentId: txCategory === 'Investment' && linkedInvestmentId ? linkedInvestmentId : undefined,
        }),
      });
      const savedDate = date;
      setShowAddForm(false);
      resetForm();
      notifyIfOutsideFilter(savedDate, 'saved');
      setPage(1);
      loadTransactions();
      loadAccounts();
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
      const actualAccount = showNewAccountInput ? newAccountName : account;
      await apiFetch(`/transactions/${editingTx.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          description,
          category: txCategory,
          amount: parseFloat(amount),
          type: txType,
          paymentMode,
          account: actualAccount,
          notes,
          investmentId: txCategory === 'Investment' && linkedInvestmentId ? linkedInvestmentId : null,
        }),
      });
      const savedDate = date;
      setEditingTx(null);
      resetForm();
      notifyIfOutsideFilter(savedDate, 'updated');
      loadTransactions();
      loadAccounts();
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
      if (res.importedCount === 0 && res.duplicatesSkipped === 0) {
        alert('No transactions were parsed from the input. Check the format and try again.');
      }
      setShowImportForm(false);
      setImportRawData('');
      setPage(1);
      loadTransactions();
    } catch (err) {
      alert(err || 'Import failed');
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (type) params.set('type', type);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/transactions/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export transactions CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download CSV');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      if (txs.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadTransactions();
      }
    } catch (err) {
      alert(err || 'Failed to delete');
    }
  };

  const handleUpdateOpeningBalance = async (id: string, newBalance: number) => {
    try {
      await apiFetch(`/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          openingBalance: newBalance,
        }),
      });
      loadAccounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update opening balance');
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
            onClick={() => setShowManageAccounts(true)}
            className="flex items-center space-x-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <Wallet className="w-4 h-4" />
            <span>Manage Accounts</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center space-x-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
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


      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <div className="flex-1">
            <p className="font-medium text-rose-300">Failed to load transactions</p>
            <p className="mt-1 text-rose-200/80">{error}</p>
          </div>
          <button
            onClick={loadTransactions}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 transition-all hover:bg-rose-500/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search description..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
          />
        </div>
        <div>
          <select
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
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
            onChange={(e) => {
              setPage(1);
              setType(e.target.value);
            }}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>
        <div>
          <select
            value={accountFilter}
            onChange={(e) => {
              setPage(1);
              setAccountFilter(e.target.value);
            }}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white"
          >
            <option value="">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.name}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white"
          />
        </div>
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
            className="w-full bg-[#161b22] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white"
          />
        </div>
        <button
          onClick={() => {
            setSearch('');
            setCategory('');
            setType('');
            setAccountFilter('');
            setPage(1);
            setStartDate(getFirstDayOfMonth());
            setEndDate(getLastDayOfMonth());
          }}
          className="bg-gray-800/40 hover:bg-gray-800 hover:text-white text-gray-400 px-4 py-2 rounded-lg text-sm transition-all border border-gray-800"
        >
          Reset Filters
        </button>
      </div>


      {/* Filter Summary Bar */}
      {!loading && !error && total > 0 && (() => {
        const totalIncome  = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const net = totalIncome - totalExpense;
        const isFiltered = search || category || type;
        const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
        const rangeEnd = Math.min(page * pageSize, total);
        return (
          <div className={`flex flex-wrap items-center gap-3 mb-4 px-4 py-3 rounded-xl border text-sm ${
            isFiltered ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#161b22] border-gray-800'
          }`}>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mr-1">
              {isFiltered ? 'Filtered' : 'All'} · {rangeStart}-{rangeEnd} of {total} record{total !== 1 ? 's' : ''}
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
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-rose-400">
                    Could not load transactions. Use the Retry button above.
                  </td>
                </tr>
              ) : txs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No transactions found for the selected date range and filters. Widen the dates or adjust filters.
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
                    <td className="py-3 px-4 font-medium text-white">
                      <div>{tx.description}</div>
                      {tx.notes && <div className="text-xs text-gray-500 font-normal mt-0.5">{tx.notes}</div>}
                    </td>
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

        {!loading && !error && total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-800 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="bg-[#0d0f14] border border-gray-800 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
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
                  {showNewAccountInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New Account Name"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        className="flex-1 bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewAccountInput(false);
                          setAccount(accounts[0]?.name || 'HDFC Savings Account');
                        }}
                        className="text-xs text-gray-400 hover:text-white px-2 border border-gray-800 rounded-lg bg-gray-850 hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <select
                      value={account}
                      onChange={(e) => {
                        if (e.target.value === 'CREATE_NEW') {
                          setShowNewAccountInput(true);
                          setNewAccountName('');
                        } else {
                          setAccount(e.target.value);
                        }
                      }}
                      className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.name}>
                          {acc.name}
                        </option>
                      ))}
                      <option value="CREATE_NEW">+ Create New...</option>
                    </select>
                  )}
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
      {/* Manage Accounts Modal */}
      {showManageAccounts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Manage Accounts</h2>
              <button
                onClick={() => setShowManageAccounts(false)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Configure opening balances for your accounts. Changes will immediately update your Net Worth and Balance.
            </p>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                  <div>
                    <h3 className="font-semibold text-sm text-white">{acc.name}</h3>
                    <p className="text-xs text-gray-400">Currency: {acc.currency}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Opening Balance:</span>
                    <input
                      type="number"
                      value={editingAccountBalances[acc.id] !== undefined ? editingAccountBalances[acc.id] : acc.openingBalance}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setEditingAccountBalances((prev) => ({ ...prev, [acc.id]: isNaN(val) ? 0 : val }));
                      }}
                      className="w-28 bg-[#0d0f14] border border-gray-850 rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleUpdateOpeningBalance(acc.id, editingAccountBalances[acc.id] ?? acc.openingBalance)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs px-3 py-1.5 rounded-lg transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

