import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navigation } from './components/Navigation.js';
import { AuthPage } from './pages/AuthPage.js';
import { Dashboard } from './pages/Dashboard.js';
import { Transactions } from './pages/Transactions.js';
import { Budgets } from './pages/Budgets.js';
import { Loans } from './pages/Loans.js';
import { Investments } from './pages/Investments.js';
import { Insurance } from './pages/Insurance.js';
import { Goals } from './pages/Goals.js';
import { Insights } from './pages/Insights.js';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTabState] = useState(() => {
    const path = window.location.pathname.replace('/', '');
    const validTabs = ['dashboard', 'transactions', 'budgets', 'loans', 'investments', 'insurance', 'goals', 'insights'];
    return validTabs.includes(path) ? path : 'dashboard';
  });

  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '');
      const validTabs = ['dashboard', 'transactions', 'budgets', 'loans', 'investments', 'insurance', 'goals', 'insights'];
      if (validTabs.includes(path)) {
        setActiveTabState(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    
    // Set initial pathname if at root
    if (window.location.pathname === '/') {
      window.history.replaceState(null, '', '/dashboard');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setActiveTab = (tab: string) => {
    window.history.pushState(null, '', `/${tab}`);
    setActiveTabState(tab);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-400" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex min-h-screen bg-[#0d0f14]">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col min-w-0">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'transactions' && <Transactions />}
        {activeTab === 'budgets' && <Budgets />}
        {activeTab === 'loans' && <Loans />}
        {activeTab === 'investments' && <Investments />}
        {activeTab === 'insurance' && <Insurance />}
        {activeTab === 'goals' && <Goals />}
        {activeTab === 'insights' && <Insights />}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
};

export default App;
