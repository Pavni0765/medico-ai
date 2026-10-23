import React, { useState } from 'react';
import { 
  BellRing, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Sliders, 
  RefreshCw, 
  ArrowRight,
  Filter,
  SlidersHorizontal,
  Building2,
  Boxes
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { NavTab } from '../components/Sidebar';
import { User, ShortageAlert } from '../types';

interface AlertsPageProps {
  currentUser: User;
  onNavigate: (tab: NavTab) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ currentUser, onNavigate }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [thresholdHours, setThresholdHours] = useState<number>(StorageService.getStaleHoursThreshold());

  const alerts = StorageService.getAlerts();
  const facilities = StorageService.getFacilities();
  const medicines = StorageService.getMedicines();

  const handleUpdateThreshold = (hours: number) => {
    setThresholdHours(hours);
    StorageService.setStaleHoursThreshold(hours);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
    if (selectedType !== 'all' && alert.type !== selectedType) return false;
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => a.severity === 'info').length;

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1h ago';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Stock Shortage & Freshness Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Automated notifications for stockouts, threshold breaches, unverified stale reports, and unresponded emergency requests.
          </p>
        </div>

        {/* Severity overview chips */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            {criticalCount} Critical
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {warningCount} Warnings
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
            {infoCount} Info
          </span>
        </div>
      </div>

      {/* Freshness Threshold Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 flex-shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configurable Freshness Threshold</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inventory records not updated within this timeframe are automatically flagged as <strong className="text-slate-700">Unverified / Stale</strong> to prevent failed dispatches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <span className="text-xs font-bold text-teal-900 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
              Threshold: {thresholdHours} Hours
            </span>

            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              {[12, 24, 48, 72].map((h) => (
                <button
                  key={h}
                  onClick={() => handleUpdateThreshold(h)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    thresholdHours === h
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Filter Severity:</span>
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 font-medium">
            <button
              onClick={() => setSelectedSeverity('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedSeverity === 'all' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setSelectedSeverity('critical')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedSeverity === 'critical' ? 'bg-white font-bold text-rose-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setSelectedSeverity('warning')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedSeverity === 'warning' ? 'bg-white font-bold text-amber-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Warnings ({warningCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Alert Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Alert Categories</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="low_stock">Low Stock Threshold</option>
            <option value="stale_inventory">Stale / Unverified</option>
            <option value="unresponded_request">Unresponded Requests</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">No Active Alerts In Filter</h3>
            <p className="text-xs text-slate-500 mt-1">All medicine thresholds and requests within criteria are verified.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const fac = StorageService.getFacilityById(alert.facilityId);
            const med = alert.medicineId ? StorageService.getMedicineById(alert.medicineId) : null;

            const iconMap = {
              critical: <AlertCircle className="w-5 h-5 text-rose-600" />,
              warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
              info: <Clock className="w-5 h-5 text-sky-600" />,
            }[alert.severity];

            const borderMap = {
              critical: 'border-rose-200 bg-rose-50/20 hover:border-rose-300',
              warning: 'border-amber-200 bg-amber-50/15 hover:border-amber-300',
              info: 'border-sky-200 bg-sky-50/15 hover:border-sky-300',
            }[alert.severity];

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${borderMap}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 flex-shrink-0 shadow-xs">
                    {iconMap}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {alert.title}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                        alert.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : alert.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {alert.type.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-1 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Facility: {fac?.name} ({fac?.area})</span>
                      <span>•</span>
                      <span>Triggered {formatRelativeTime(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Shortcut */}
                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  {alert.type === 'unresponded_request' ? (
                    <button
                      onClick={() => onNavigate('requests')}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>View Request</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : alert.type === 'stale_inventory' || alert.type === 'low_stock' ? (
                    <button
                      onClick={() => onNavigate(currentUser.role === 'pharmacy' ? 'inventory' : 'search')}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>{currentUser.role === 'pharmacy' ? 'Verify Stock' : 'Find Supplier'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('search')}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Locate Nearest Stock</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
