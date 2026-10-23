import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { SafetyBanner } from './components/SafetyBanner';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { SearchPage } from './pages/SearchPage';
import { RequestsPage } from './pages/RequestsPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AiCopilotPage } from './pages/AiCopilotPage';
import { StorageService, subscribeToStorage } from './services/storageService';
import { User, StockRequest } from './types';
import { CheckCircle2, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('landing');
  const [currentUser, setCurrentUser] = useState<User>(StorageService.getCurrentUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [versionKey, setVersionKey] = useState(0); // Forces re-render on storage change
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to storage modifications
  useEffect(() => {
    StorageService.init();
    const unsubscribe = subscribeToStorage(() => {
      setVersionKey((prev) => prev + 1);
      setCurrentUser(StorageService.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUserChange = (user: User) => {
    StorageService.setCurrentUser(user);
    setCurrentUser(user);
    showToast(`Switched persona to ${user.name} (${user.role === 'clinic' ? 'Clinic / Hospital' : 'Pharmacy'})`);
  };

  const handleResetData = () => {
    StorageService.resetDemoData();
    setCurrentUser(StorageService.getCurrentUser());
    showToast('Demo dataset successfully restored to original hackathon baseline.');
  };

  // Live counts for badges
  const requests = StorageService.getRequests();
  const openRequestsCount = requests.filter(
    (r) => r.status === 'open' || r.status === 'supplier_contacted'
  ).length;
  const alerts = StorageService.getAlerts();
  const alertCount = alerts.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Clinical & Safety Banner */}
      <SafetyBanner />

      {/* Main Navbar */}
      <Navbar
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onResetData={handleResetData}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        alertCount={alertCount}
        onNavigateToAlerts={() => setCurrentTab('alerts')}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          currentUser={currentUser}
          openRequestsCount={openRequestsCount}
          alertCount={alertCount}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {currentTab === 'landing' && (
            <LandingPage
              onNavigate={setCurrentTab}
              currentUser={currentUser}
              onUserChange={handleUserChange}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={setCurrentTab}
              currentUser={currentUser}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryPage currentUser={currentUser} />
          )}

          {currentTab === 'search' && (
            <SearchPage
              currentUser={currentUser}
              onNavigateToRequests={() => setCurrentTab('requests')}
            />
          )}

          {currentTab === 'requests' && (
            <RequestsPage currentUser={currentUser} />
          )}

          {currentTab === 'alerts' && (
            <AlertsPage
              currentUser={currentUser}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsPage />
          )}

          {currentTab === 'ai_copilot' && (
            <AiCopilotPage />
          )}
        </main>
      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">MedStock AI</span>
            <span>•</span>
            <span>Essential Medicine Availability Coordination Mesh</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>WHO & CDSCO Essential Drugs</span>
            <span>•</span>
            <span>INR (₹) Standard</span>
            <span>•</span>
            <span className="text-teal-600 font-semibold">Hackathon MVP Edition</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
