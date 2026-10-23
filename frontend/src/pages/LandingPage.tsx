import React from 'react';
import { 
  Pill, 
  Search, 
  ShieldCheck, 
  Truck, 
  ArrowRight, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Sparkles,
  AlertTriangle,
  Stethoscope,
  Store,
  Layers,
  HeartPulse
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';
import { User } from '../types';
import { StorageService } from '../services/storageService';

interface LandingPageProps {
  onNavigate: (tab: NavTab) => void;
  currentUser: User;
  onUserChange: (user: User) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  currentUser,
  onUserChange,
}) => {
  const facilities = StorageService.getFacilities();
  const medicines = StorageService.getMedicines();
  const requests = StorageService.getRequests();
  const inventory = StorageService.getInventory();

  const pharmacies = facilities.filter((f) => f.type === 'pharmacy');
  const clinics = facilities.filter((f) => f.type === 'clinic' || f.type === 'hospital');
  const totalStockUnits = inventory.reduce((sum, item) => sum + item.availableQuantity, 0);

  const handleSelectRole = (role: 'clinic' | 'pharmacy') => {
    const users = StorageService.getAvailableUsers();
    const targetUser = users.find((u) => u.role === role);
    if (targetUser) {
      onUserChange(targetUser);
    }
    if (role === 'pharmacy') {
      onNavigate('inventory');
    } else {
      onNavigate('search');
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white p-8 sm:p-12 lg:p-16 shadow-xl">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-teal-300" />
            <span>Smart Essential Medicine Availability & Shortage Coordination</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Find Medicines Faster. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-200 to-sky-300">
              Connect Healthcare Better.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-200 font-normal leading-relaxed mb-8 max-w-2xl">
            MedStock AI bridges the critical coordination gap between urban hospitals, outpatient clinics, and community pharmacies. Eliminate fragmented phone calls, discover nearby verified medicine stock in real time, and coordinate shortage emergency transfers with intelligent proximity matching.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Activity className="w-4 h-4 text-slate-950" />
              <span>Open Live Dashboard</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              onClick={() => onNavigate('search')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/20 transition-all"
            >
              <Search className="w-4 h-4 text-teal-300" />
              <span>Explore Medicine Search</span>
            </button>
          </div>
        </div>

        {/* Live Network Stats Strip */}
        <div className="relative z-10 mt-12 pt-8 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{pharmacies.length}</p>
            <p className="text-xs text-teal-200 font-medium">Participating Pharmacies</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{clinics.length}</p>
            <p className="text-xs text-teal-200 font-medium">Clinics & Hospitals</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{medicines.length}</p>
            <p className="text-xs text-teal-200 font-medium">NLEM Essential Medicines</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{totalStockUnits.toLocaleString()}</p>
            <p className="text-xs text-teal-200 font-medium">Reported Units Tracked</p>
          </div>
        </div>
      </section>

      {/* Interactive Role Switcher Section */}
      <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Interactive Hackathon Demo Switcher
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3">
            Experience MedStock AI from Both Sides of the Network
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Switch between Clinic Requester and Pharmacy Supplier roles anytime with 1 click to evaluate complete end-to-end shortage fulfillment workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clinic Role Card */}
          <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/40 p-6 flex flex-col justify-between hover:border-sky-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-sky-100 text-sky-700 rounded-xl">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800">
                  Healthcare Provider Role
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Hospital & Clinic Persona</h3>
              <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
                As a clinic doctor or nursing superintendent facing a sudden medicine stockout:
              </p>
              <ul className="space-y-2 text-xs text-slate-700 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span>Search essential medicines by generic name or brand</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span>Discover candidate suppliers ranked by proximity & freshness</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span>Submit emergency shortage RFQs with clinical urgency levels</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectRole('clinic')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <span>Switch to Clinic Role (Dr. Priya Sundaram)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Pharmacy Role Card */}
          <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-6 flex flex-col justify-between hover:border-emerald-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Store className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  Pharmacy Supplier Role
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Dispensing Pharmacy Persona</h3>
              <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
                As a registered pharmacy or institutional distributor:
              </p>
              <ul className="space-y-2 text-xs text-slate-700 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Manage live stock counts, batch numbers, and low-stock alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Update freshness timestamps to keep your inventory verified</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Respond directly to incoming shortage requests from nearby clinics</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectRole('pharmacy')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <span>Switch to Pharmacy Role (Ramesh Patel)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            How MedStock AI Solves the Healthcare Shortage Crisis
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Engineered specifically for clinical accuracy, strict safety non-substitution, and fast supplier coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">1. Smart Medicine Search</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Interprets common drug trade names, active generic formulations, strength specifications (e.g., 650mg, 1g), and dosage forms with built-in typo resilience.
            </p>
            <div className="text-[11px] text-teal-700 font-semibold bg-teal-50/80 px-2.5 py-1.5 rounded-lg border border-teal-100">
              Deterministic matching • No guesswork
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center mb-4">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">2. Proximity Supplier Ranking</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Calculates real Haversine road distances across Bengaluru districts, factoring reported quantity, report freshness, and formulation compatibility.
            </p>
            <div className="text-[11px] text-sky-700 font-semibold bg-sky-50/80 px-2.5 py-1.5 rounded-lg border border-sky-100">
              Ranked with explicit reason codes
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">3. Freshness Verification & Safety</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Stale stock reports (over 24h old) are visibly flagged as unverified. Automatically generates standardized supplier RFQs requiring written batch confirmation.
            </p>
            <div className="text-[11px] text-amber-800 font-semibold bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200">
              Zero unauthorized substitutions
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Protocol Banner */}
      <section className="rounded-2xl border border-teal-200 bg-teal-50/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-600 text-white flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Regulatory Compliance & Safe Coordination Guardrails</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              MedStock AI strictly adheres to CDSCO Schedule H/H1 tracking regulations. All prices displayed in Indian Rupees (INR ₹).
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="whitespace-nowrap px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs"
        >
          Launch Platform Dashboard
        </button>
      </section>
    </div>
  );
};
