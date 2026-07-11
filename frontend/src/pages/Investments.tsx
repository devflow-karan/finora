import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Plus, ArrowUpRight, Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

const ASSET_TYPE_OPTIONS = [
  { value: 'MUTUAL_FUND', label: 'Mutual Fund' },
  { value: 'STOCK', label: 'Stock Equity' },
  { value: 'GOLD', label: 'Gold (SGB/Physical)' },
  { value: 'FD', label: 'Fixed Deposit (FD)' },
  { value: 'PPF', label: 'PPF' },
  { value: 'EPF', label: 'EPF' },
  { value: 'NPS', label: 'NPS' },
  { value: 'SSY', label: 'Sukanya Samriddhi Yojana (SSY)' },
  { value: 'CRYPTO', label: 'Crypto' },
];

interface PaginatedItems {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function parseItemsResponse(summary: any, page: number, pageSize: number): PaginatedItems {
  const items = summary?.items;
  if (items && typeof items === 'object' && Array.isArray(items.data)) {
    return {
      data: items.data,
      total: items.total ?? items.data.length,
      page: items.page ?? page,
      limit: items.limit ?? pageSize,
      totalPages: items.totalPages ?? Math.max(1, Math.ceil((items.total ?? items.data.length) / pageSize)),
    };
  }

  if (Array.isArray(items)) {
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      data: items.slice(start, start + pageSize),
      total,
      page,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  return { data: [], total: 0, page, limit: pageSize, totalPages: 1 };
}

export const Investments: React.FC = () => {
  const { apiFetch } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [assetType, setAssetType] = useState('');
  const [profitStatus, setProfitStatus] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('MUTUAL_FUND');
  const [principal, setPrincipal] = useState('');
  const [units, setUnits] = useState('');
  const [nav, setNav] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [value, setValue] = useState('');
  const [isSip, setIsSip] = useState(false);
  const [sipAmount, setSipAmount] = useState('');

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType !== 'MUTUAL_FUND') {
      setIsSip(false);
      setSipAmount('');
    }
  };

  const buildSummaryQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (assetType) params.set('type', assetType);
    if (profitStatus) params.set('profitStatus', profitStatus);
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    return `/investments/summary?${params.toString()}`;
  }, [search, assetType, profitStatus, page, pageSize]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(buildSummaryQuery());
      const paginated = parseItemsResponse(data, page, pageSize);
      setSummary(data);
      setItems(paginated.data);
      setTotal(paginated.total);
      setTotalPages(paginated.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, assetType, profitStatus, page, pageSize]);

  // Quick value update state
  const [quickUpdateId, setQuickUpdateId] = useState<string | null>(null);
  const [quickValue, setQuickValue] = useState('');

  const handleQuickUpdate = async (id: string) => {
    if (!quickValue) return;
    try {
      await apiFetch(`/investments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ value: parseFloat(quickValue), profit: parseFloat(quickValue) - (items.find((i: any) => i.id === id)?.principal || 0) }),
      });
      setQuickUpdateId(null);
      setQuickValue('');
      loadData();
    } catch (err) {
      alert('Update failed');
    }
  };

  // Inline SIP edit state
  const [sipEditId, setSipEditId] = useState<string | null>(null);
  const [sipEditIsSip, setSipEditIsSip] = useState(false);
  const [sipEditAmount, setSipEditAmount] = useState('');

  const openSipEdit = (item: any) => {
    setSipEditId(item.id);
    setSipEditIsSip(!!item.isSip);
    setSipEditAmount(item.sipAmount ? String(item.sipAmount) : '');
  };

  const handleSipSave = async (id: string) => {
    if (sipEditIsSip && !sipEditAmount) {
      alert('Enter the monthly SIP amount');
      return;
    }
    try {
      await apiFetch(`/investments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          isSip: sipEditIsSip,
          sipAmount: sipEditIsSip ? parseFloat(sipEditAmount) : null,
        }),
      });
      setSipEditId(null);
      loadData();
    } catch (err) {
      alert('SIP update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this investment record?')) return;
    try {
      await apiFetch(`/investments/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'MUTUAL_FUND' && isSip && !sipAmount) {
      alert('Enter the monthly SIP amount');
      return;
    }
    try {
      await apiFetch('/investments', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          principal: parseFloat(principal),
          units: units ? parseFloat(units) : null,
          navOrPrice: nav ? parseFloat(nav) : null,
          isSip: type === 'MUTUAL_FUND' ? isSip : false,
          sipAmount: type === 'MUTUAL_FUND' && isSip ? parseFloat(sipAmount) : null,
          purchaseDate: new Date(purchaseDate).toISOString(),
          value: parseFloat(value || principal),
        }),
      });
      setShowAddForm(false);
      // Reset
      setName('');
      setPrincipal('');
      setUnits('');
      setNav('');
      setValue('');
      setIsSip(false);
      setSipAmount('');
      loadData();
    } catch (err) {
      alert(err || 'Failed to add investment');
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex-1 bg-[#0d0f14] p-4 sm:p-6 lg:p-8 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-400" />
      </div>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280', '#06b6d4'];
  const isFiltered = search || assetType || profitStatus;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const filteredProfit = items.reduce((sum, item) => sum + item.profit, 0);
  const filteredInvested = items.reduce((sum, item) => sum + item.principal, 0);
  const filteredValue = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex-1 bg-[#0d0f14] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investment Portfolio</h1>
          <p className="text-gray-400 text-sm mt-1">Audit equity, mutual funds, EPF, NPS, PPF, and Sovereign Gold bonds.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Asset Record</span>
        </button>
      </div>

      {/* Portfolio overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Portfolio Value</span>
          <h3 className="text-2xl font-bold mt-2">₹{summary.totalValue.toLocaleString('en-IN')}</h3>
          <span className="text-emerald-400 text-xs flex items-center mt-2">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            Gain: ₹{summary.totalProfit.toLocaleString('en-IN')} ({summary.profitPercentage}%)
          </span>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Invested Capital</span>
          <h3 className="text-2xl font-bold mt-2">₹{summary.totalInvested.toLocaleString('en-IN')}</h3>
          <span className="text-xs text-gray-500 block mt-2">Net principal deposits</span>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Portfolio XIRR</span>
          <h3 className="text-2xl font-bold text-emerald-400 mt-2">{summary.portfolioXirr}%</h3>
          <span className="text-xs text-gray-500 block mt-2">Internal rate of return</span>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Monthly SIP</span>
          <h3 className="text-2xl font-bold text-amber-400 mt-2">₹{(summary.totalMonthlySip || 0).toLocaleString('en-IN')}</h3>
          <span className="text-xs text-gray-500 block mt-2">Active SIP commitments</span>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Secured Ratio</span>
            <h3 className="text-2xl font-bold text-blue-400 mt-2">
              {summary.allocation.find((a: any) => a.type === 'FD' || a.type === 'PPF' || a.type === 'EPF' || a.type === 'SSY') ? 'Stable' : 'Aggressive'}
            </h3>
          </div>
          <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 items-start">
        <div className="lg:col-span-2 bg-[#161b22] border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Invested Instruments</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by investment name..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
              />
            </div>
            <select
              value={assetType}
              onChange={(e) => {
                setPage(1);
                setAssetType(e.target.value);
              }}
              className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white"
            >
              <option value="">All Asset Types</option>
              {ASSET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={profitStatus}
              onChange={(e) => {
                setPage(1);
                setProfitStatus(e.target.value);
              }}
              className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white"
            >
              <option value="">All P/L Status</option>
              <option value="profit">Profit Making</option>
              <option value="loss">Loss Making</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            {(isFiltered || total > 0) && (
              <div className={`flex flex-wrap items-center gap-3 flex-1 px-4 py-3 rounded-xl border text-sm ${
                isFiltered ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#0d0f14] border-gray-850'
              }`}>
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  {isFiltered ? 'Filtered' : 'All'} · {rangeStart}-{rangeEnd} of {total} asset{total !== 1 ? 's' : ''}
                </span>
                {isFiltered && total > 0 && (
                  <>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-gray-500 text-xs">Invested</span>
                      <span className="font-bold text-white">₹{filteredInvested.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-gray-500 text-xs">Value</span>
                      <span className="font-bold text-white">₹{filteredValue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-gray-500 text-xs">P/L</span>
                      <span className={`font-bold ${filteredProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {filteredProfit >= 0 ? '+' : ''}₹{filteredProfit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
            {isFiltered && (
              <button
                onClick={() => {
                  setSearch('');
                  setAssetType('');
                  setProfitStatus('');
                  setPage(1);
                }}
                className="bg-gray-800/40 hover:bg-gray-800 hover:text-white text-gray-400 px-4 py-2 rounded-lg text-sm transition-all border border-gray-800 whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                No investments found for the selected filters.
              </div>
            ) : (
            items.map((item: any) => (
              <div key={item.id} className="p-4 bg-[#0d0f14] border border-gray-850 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0 sm:flex-1 sm:pr-3">
                    <h4 className="font-semibold text-sm text-white truncate">{item.name}</h4>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                      <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700 whitespace-nowrap">
                        {item.type}
                      </span>
                      {item.isSip && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                          SIP · ₹{Number(item.sipAmount || 0).toLocaleString('en-IN')}/mo
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        Invested: ₹{item.principal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-sm text-white">₹{item.value.toLocaleString('en-IN')}</p>
                      <span className={`text-[10px] font-semibold ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.profit >= 0 ? '+' : ''}₹{item.profit.toLocaleString('en-IN')} · {Number(item.cagr).toFixed(2)}% CAGR
                      </span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => { setQuickUpdateId(item.id); setQuickValue(String(item.value)); }}
                        className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20 transition-all whitespace-nowrap"
                      >
                        Update ₹
                      </button>
                      {item.type === 'MUTUAL_FUND' && (
                        <button
                          onClick={() => openSipEdit(item)}
                          className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/20 transition-all whitespace-nowrap"
                        >
                          SIP
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-1 rounded-lg border border-rose-500/20 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline quick update input */}
                {quickUpdateId === item.id && (
                  <div className="mt-3 flex items-center space-x-2 pt-3 border-t border-gray-800">
                    <span className="text-xs text-gray-400 whitespace-nowrap">New value (₹)</span>
                    <input
                      type="number"
                      value={quickValue}
                      onChange={(e) => setQuickValue(e.target.value)}
                      autoFocus
                      className="flex-1 bg-[#161b22] border border-emerald-500/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleQuickUpdate(item.id)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setQuickUpdateId(null)}
                      className="text-gray-500 hover:text-white px-2 py-1.5 rounded-lg text-xs transition-all"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Inline SIP edit panel */}
                {sipEditId === item.id && (
                  <div className="mt-3 space-y-2 pt-3 border-t border-gray-800">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sipEditIsSip}
                        onChange={(e) => setSipEditIsSip(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#0d0f14] border-gray-700 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-xs text-white">This is a SIP (Systematic Investment Plan)</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400 whitespace-nowrap">Monthly SIP (₹)</span>
                      <input
                        type="number"
                        value={sipEditAmount}
                        onChange={(e) => setSipEditAmount(e.target.value)}
                        disabled={!sipEditIsSip}
                        autoFocus
                        className="flex-1 bg-[#161b22] border border-amber-500/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-40"
                      />
                      <button
                        onClick={() => handleSipSave(item.id)}
                        className="bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setSipEditId(null)}
                        className="text-gray-500 hover:text-white px-2 py-1.5 rounded-lg text-xs transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
            )}
          </div>

          {total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-800 mt-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
                  className="bg-[#0d0f14] border border-gray-850 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Asset Allocation Chart */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 font-semibold">Asset Allocation</h2>
          <div className="h-60 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.allocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {summary.allocation.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value ? `₹${Number(value).toLocaleString('en-IN')}` : ''} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-4 max-h-24 overflow-y-auto">
            {summary.allocation.map((item: any, index: number) => (
              <div key={item.type} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{item.type} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Investment Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Add Asset Record</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g., SBI Bluechip Mutual Fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Asset Type</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select asset type</option>
                    {ASSET_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {type === 'MUTUAL_FUND' && (
                <div className="bg-[#0d0f14] border border-gray-850 rounded-lg p-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSip}
                      onChange={(e) => setIsSip(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#0d0f14] border-gray-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-white">This is a SIP (Systematic Investment Plan)</span>
                  </label>
                  {isSip && (
                    <div className="mt-3">
                      <label className="block text-xs text-gray-400 mb-1">Monthly SIP Amount (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g., 5000"
                        value={sipAmount}
                        onChange={(e) => setSipAmount(e.target.value)}
                        className="w-full bg-[#161b22] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Units (Optional)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Units"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">NAV / Price (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={nav}
                    onChange={(e) => setNav(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Principal Capital (₹)</label>
                  <input
                    type="number"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Current Value (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., 360000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-gray-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
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
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
