import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

export const Insights: React.FC = () => {
  const { apiFetch } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [healthScore, recommendations] = await Promise.all([
          apiFetch('/insights/health'),
          apiFetch('/insights'),
        ]);
        setHealth(healthScore);
        setInsights(recommendations);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !health) {
    return (
      <div className="flex-1 bg-[#0d0f14] p-8 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-400" />
      </div>
    );
  }

  const { score, breakdown } = health;

  return (
    <div className="flex-1 bg-[#0d0f14] text-white p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Health & Insights</h1>
          <p className="text-gray-400 text-sm mt-1">Audit personal financial metrics and review AI money coach suggestions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Health Score breakdown */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6 h-fit">
          <div className="text-center mb-6 border-b border-gray-850 pb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Financial Health Index</h2>
            <div className="relative inline-flex items-center justify-center">
              <span className={`text-5xl font-black ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                {score}
              </span>
              <span className="text-xs text-gray-500 ml-1">/100</span>
            </div>
            <p className="text-xs text-gray-400 mt-3 font-medium">
              {score >= 80 ? 'Excellent financial posture!' : score >= 50 ? 'Fair financial habits.' : 'Needs critical adjustment.'}
            </p>
          </div>

          <div className="space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Breakdown Indices</h3>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-300">Savings Rate Score ({breakdown.savingsRate.value}%)</span>
                <span className="font-semibold text-emerald-400">{breakdown.savingsRate.score}/20</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(breakdown.savingsRate.score / 20) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-300">Debt-to-Income Score (EMI: {breakdown.debtRatio.value}%)</span>
                <span className="font-semibold text-emerald-400">{breakdown.debtRatio.score}/20</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(breakdown.debtRatio.score / 20) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-300">Insurance Cover Score ({breakdown.insuranceCoverage.activePolicies} Active)</span>
                <span className="font-semibold text-emerald-400">{breakdown.insuranceCoverage.score}/20</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(breakdown.insuranceCoverage.score / 20) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-300">Emergency Fund Score ({breakdown.emergencyFund.monthsCovered} Mo cover)</span>
                <span className="font-semibold text-emerald-400">{breakdown.emergencyFund.score}/20</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(breakdown.emergencyFund.score / 20) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-300">Investment Ratio Score ({breakdown.investmentRatio.value}%)</span>
                <span className="font-semibold text-emerald-400">{breakdown.investmentRatio.score}/20</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(breakdown.investmentRatio.score / 20) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: list of AI recommendations */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI Analytical Recommendations</span>
          </h2>

          <div className="space-y-4">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border flex items-start space-x-4 ${
                  insight.type === 'WARNING'
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                    : insight.type === 'TIP'
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
                    : 'bg-blue-500/5 border-blue-500/20 text-blue-200'
                }`}
              >
                <div className="mt-1">
                  {insight.type === 'WARNING' ? (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-white">{insight.category}</span>
                    <span className="text-[9px] bg-gray-850 text-gray-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                      {insight.type}
                    </span>
                  </div>
                  <p className="text-xs mt-2 leading-relaxed opacity-90">{insight.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
