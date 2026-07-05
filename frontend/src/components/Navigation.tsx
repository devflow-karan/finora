import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  TrendingUp,
  FileHeart,
  Target,
  Sparkles,
  LogOut,
  CreditCard,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', name: 'Transactions', icon: Receipt },
    { id: 'budgets', name: 'Budgets', icon: PiggyBank },
    { id: 'loans', name: 'Loans & EMIs', icon: CreditCard },
    { id: 'investments', name: 'Investments', icon: TrendingUp },
    { id: 'insurance', name: 'Insurance', icon: FileHeart },
    { id: 'goals', name: 'Financial Goals', icon: Target },
    { id: 'insights', name: 'Health & Insights', icon: Sparkles },
  ];

  return (
    <aside className="w-64 bg-[#161b22] border-r border-gray-800 flex flex-col justify-between h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-400 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg">
            {user?.email ? user.email.trim().charAt(0).toUpperCase() : user?.name ? user.name.trim().charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Finora</h2>
            <span className="text-xs text-gray-400">Family Finance</span>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/40 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
