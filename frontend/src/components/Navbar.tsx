import React, { useState } from 'react';
import { 
  Pill, 
  RotateCcw, 
  Building2, 
  Stethoscope, 
  Store, 
  Menu, 
  X, 
  Bell, 
  CheckCircle2, 
  ChevronDown,
  Sparkles,
  Info
} from 'lucide-react';
import { User, Facility } from '../types';
import { StorageService } from '../services/storageService';

interface NavbarProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  onResetData: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  alertCount: number;
  onNavigateToAlerts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
  onResetData,
  mobileMenuOpen,
  setMobileMenuOpen,
  alertCount,
  onNavigateToAlerts,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const availableUsers = StorageService.getAvailableUsers();
  const currentFacility = StorageService.getFacilityById(currentUser.facilityId);

  const handleSelectUser = (user: User) => {
    onUserChange(user);
    setRoleDropdownOpen(false);
  };

  const handleConfirmReset = () => {
    onResetData();
    setResetConfirmOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                  <Pill className="w-5 h-5 transform rotate-45" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg tracking-tight text-slate-900">
                      MedStock<span className="text-teal-600">.AI</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                      MVP v1.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden md:block">
                    Medicine Availability & Shortage Coordination Platform
                  </p>
                </div>
              </div>
            </div>

            {/* Role Switcher & Facility Badge */}
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Alert notifications */}
              <button
                onClick={onNavigateToAlerts}
                className="relative p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                title={`${alertCount} active alerts`}
              >
                <Bell className="w-5 h-5" />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {alertCount}
                  </span>
                )}
              </button>

              {/* Demo Role Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors text-xs sm:text-sm"
                >
                  <div className={`p-1.5 rounded-lg ${
                    currentUser.role === 'clinic' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {currentUser.role === 'clinic' ? (
                      <Stethoscope className="w-4 h-4" />
                    ) : (
                      <Store className="w-4 h-4" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{currentUser.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        currentUser.role === 'clinic' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {currentUser.role === 'clinic' ? 'Clinic / Hospital' : 'Pharmacy'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {currentFacility?.name || 'Facility'} ({currentFacility?.area})
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl ring-1 ring-black/5 border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Demo Role Selector
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Switch persona to evaluate both sides of coordination
                      </p>
                    </div>

                    <div className="py-1">
                      {availableUsers.map((u) => {
                        const fac = StorageService.getFacilityById(u.facilityId);
                        const isCurrent = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors ${
                              isCurrent ? 'bg-teal-50/70' : ''
                            }`}
                          >
                            <div className={`mt-0.5 p-1.5 rounded-lg ${
                              u.role === 'clinic' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {u.role === 'clinic' ? <Stethoscope className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-900 truncate">{u.name}</span>
                                {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                              </div>
                              <p className="text-[11px] text-slate-600 truncate">{fac?.name}</p>
                              <span className="text-[10px] text-slate-400 capitalize">
                                Role: {u.role === 'clinic' ? 'Clinic Requester' : 'Pharmacy Supplier'} • {fac?.area}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset Demo Data Button */}
              <button
                onClick={() => setResetConfirmOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Reset sample data to initial state"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Reset Confirmation Dialog */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Reset Demo Data?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              This will reseed all 8 pharmacies, 3 clinics, 18 essential medicines, realistic stock quantities, and sample requests back to their initial hackathon evaluation state.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
              >
                Yes, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
