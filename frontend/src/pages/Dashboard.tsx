import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Percent,
  PiggyBank,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [summary, healthScore, recommendations] = await Promise.all([
          apiFetch('/dashboard'),
          apiFetch('/insights/health'),
          apiFetch('/insights'),
        ]);
        setData(summary);
        setHealth(healthScore);
        setInsights(recommendations);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 bg-[#0d0f14] p-8 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-400" />
      </div>
    );
  }

  const { cards, charts } = data;
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

  return (
    <div className="flex-1 bg-[#0d0f14] text-white p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Family Finance Command Center</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time assets, budgets, debt reduction, and goals tracking.</p>
        </div>
        <div className="flex items-center space-x-4 bg-[#161b22] px-4 py-2.5 rounded-xl border border-gray-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Financial Health Score:</span>
            <span className={`text-base font-extrabold ${health?.score >= 80 ? 'text-emerald-400' : health?.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {health?.score}/100
            </span>
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Net Worth */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-5">
            <TrendingUp className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Family Net Worth</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">₹{cards.netWorth.toLocaleString('en-IN')}</h3>
          <p className="text-xs text-gray-400 mt-2">Assets: ₹{cards.currentBalance + cards.totalInvestments} | Debt: ₹{cards.totalLoans}</p>
        </div>

        {/* Current Balance */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Cash/Bank Balance</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">₹{cards.currentBalance.toLocaleString('en-IN')}</h3>
          <div className="flex items-center mt-2 space-x-3 text-xs">
            <span className="text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> In: ₹{cards.monthlyIncome.toLocaleString('en-IN')}
            </span>
            <span className="text-rose-400 flex items-center">
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> Out: ₹{cards.monthlyExpenses.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Savings Rate</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">{cards.savingsRate}%</h3>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, cards.savingsRate))}%` }}
            />
          </div>
        </div>

        {/* FI Progress */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">FI Progress</span>
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">{cards.financialIndependence.progressPercentage}%</h3>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
            <div
              className="bg-violet-500 h-1.5 rounded-full transition-all"
              style={{ width: `${cards.financialIndependence.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Net Worth Growth */}
        <div className="lg:col-span-2 bg-[#161b22] border border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-bold mb-6">Net Worth & Cash Flow Growth</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.cashFlowTrend}>
                <defs>
                  <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="month" stroke="#8b949e" fontSize={11} />
                <YAxis stroke="#8b949e" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="netWorth" stroke="#10b981" fillOpacity={1} fill="url(#colorNetWorth)" name="Net Worth" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6 flex flex-col justify-between">
          <h2 className="text-base font-bold mb-4">Category-wise Expenses</h2>
          <div className="h-60 flex justify-center">
            {charts.expenseTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.expenseTrend}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.expenseTrend.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value ? `₹${Number(value).toLocaleString('en-IN')}` : ''} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center text-gray-500 text-xs">
                No expense transactions this month.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-4 max-h-24 overflow-y-auto">
            {charts.expenseTrend.map((item: any, index: number) => (
              <div key={item.name} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{item.name} ({item.value.toLocaleString('en-IN')})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights & Alerts */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-bold mb-4 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>AI Money Coach Insights</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start space-x-3 ${
                insight.type === 'WARNING'
                  ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                  : insight.type === 'TIP'
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                  : 'bg-blue-500/5 border-blue-500/20 text-blue-300'
              }`}
            >
              {insight.type === 'WARNING' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase opacity-75">{insight.category}</span>
                <p className="text-xs mt-1 leading-relaxed">{insight.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
