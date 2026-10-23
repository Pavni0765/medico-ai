import React from 'react';
import { 
  LayoutDashboard, 
  PackageSearch, 
  Boxes, 
  SendHorizontal, 
  BellRing, 
  BarChart3, 
  Bot, 
  Home, 
  CheckCircle,
  Building,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';

export type NavTab = 
  | 'landing' 
  | 'dashboard' 
  | 'inventory' 
  | 'search' 
  | 'requests' 
  | 'alerts' 
  | 'analytics' 
  | 'ai_copilot';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: User;
  openRequestsCount: number;
  alertCount: number;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  openRequestsCount,
  alertCount,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const isPharmacy = currentUser.role === 'pharmacy';

  const navItems = [
    {
      id: 'landing' as NavTab,
      label: 'Home & Overview',
      icon: Home,
      description: 'Platform story & value proposition',
    },
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Live availability & metrics',
    },
    {
      id: 'inventory' as NavTab,
      label: 'Medicine Inventory',
      icon: Boxes,
      badge: isPharmacy ? 'Pharmacy Desk' : undefined,
      description: 'Stock management & thresholds',
    },
    {
      id: 'search' as NavTab,
      label: 'Smart Medicine Search',
      icon: PackageSearch,
      badge: !isPharmacy ? 'Clinic Search' : undefined,
      description: 'Proximity matching & suppliers',
    },
    {
      id: 'requests' as NavTab,
      label: 'Shortage Requests',
      icon: SendHorizontal,
      count: openRequestsCount,
      countVariant: 'warning',
      description: 'Urgency RFQ tracking & responses',
    },
    {
      id: 'alerts' as NavTab,
      label: 'Stock Alerts',
      icon: BellRing,
      count: alertCount,
      countVariant: 'critical',
      description: 'Stockouts & stale inventory warning',
    },
    {
      id: 'analytics' as NavTab,
      label: 'Network Analytics',
      icon: BarChart3,
      description: 'Demand trends & fulfillment speed',
    },
    {
      id: 'ai_copilot' as NavTab,
      label: 'AI Shortage Hub',
      icon: Bot,
      isAi: true,
      description: 'Evidence-based shortage insights',
    },
  ];

  const handleSelect = (id: NavTab) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-200 ease-in-out lg:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col justify-between
      `}>
        {/* Navigation list */}
        <div className="p-3 space-y-1 overflow-y-auto flex-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-teal-600 text-white' 
                      : item.isAi
                      ? 'bg-purple-100 text-purple-600 group-hover:bg-purple-200'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{item.label}</span>
                      {item.isAi && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges and Counts */}
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.countVariant === 'critical'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.count}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-teal-600" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="rounded-xl p-3 bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-800">Verified Network</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              11 Bengaluru Facilities Active in Pilot Mesh
            </p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>National NLEM 2022</span>
              <span className="text-teal-600 font-semibold">Live Mode</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
