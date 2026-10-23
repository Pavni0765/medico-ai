import React from 'react';
import { 
  Building2, 
  Pill, 
  SendHorizontal, 
  AlertTriangle, 
  Clock, 
  Search, 
  ArrowUpRight, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  MapPin,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StorageService } from '../services/storageService';
import { NavTab } from '../components/Sidebar';
import { User, StockRequest, InventoryItem } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  currentUser: User;
  onSelectRequest?: (req: StockRequest) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  currentUser,
  onSelectRequest,
}) => {
  const facilities = StorageService.getFacilities();
  const medicines = StorageService.getMedicines();
  const inventory = StorageService.getInventory();
  const requests = StorageService.getRequests();
  const alerts = StorageService.getAlerts();

  // Dynamic calculations from actual data
  const suppliers = facilities.filter((f) => f.type === 'pharmacy');
  const openRequests = requests.filter((r) => r.status === 'open' || r.status === 'supplier_contacted');
  const criticalRequests = requests.filter((r) => r.urgency === 'critical' && r.status !== 'fulfilled' && r.status !== 'cancelled');
  const lowStockItems = inventory.filter((i) => i.stockStatus === 'low_stock' || i.stockStatus === 'out_of_stock');
  const staleStockItems = inventory.filter((i) => i.verificationStatus === 'stale');

  // Recent 5 stock updates sorted by lastUpdated descending
  const recentStockUpdates = [...inventory]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5);

  // Recent 5 requests sorted by createdTimestamp descending
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdTimestamp).getTime() - new Date(a.createdTimestamp).getTime())
    .slice(0, 5);

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const statusBadge = (status: StockRequest['status']) => {
    switch (status) {
      case 'open':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Open (Pending Match)</span>;
      case 'supplier_contacted':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Supplier Contacted</span>;
      case 'availability_confirmed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Stock Confirmed</span>;
      case 'fulfilled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Fulfilled</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Cancelled</span>;
      default:
        return null;
    }
  };

  const urgencyBadge = (urgency: StockRequest['urgency']) => {
    switch (urgency) {
      case 'critical':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-600 text-white animate-pulse">Critical</span>;
      case 'urgent':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500 text-white">Urgent</span>;
      case 'normal':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-200 text-slate-700">Routine</span>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header section with persona context and quick shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Medicine Availability Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time shortage coordination & live inventory mesh across {facilities.length} healthcare facilities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('search')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Medicines</span>
          </button>

          <button
            onClick={() => onNavigate(currentUser.role === 'pharmacy' ? 'inventory' : 'requests')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-teal-600" />
            <span>{currentUser.role === 'pharmacy' ? 'Manage Inventory' : 'New Shortage Request'}</span>
          </button>
        </div>
      </div>

      {/* Calculated KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Suppliers"
          value={suppliers.length}
          subtitle="Active community pharmacies & distributors"
          icon={Building2}
          color="teal"
          badge={{ text: 'Verified', variant: 'positive' }}
          onClick={() => onNavigate('search')}
        />

        <StatCard
          title="Catalog Medicines"
          value={medicines.length}
          subtitle="Essential WHO/NLEM listed medicines"
          icon={Pill}
          color="blue"
          badge={{ text: 'Active Formulations', variant: 'neutral' }}
          onClick={() => onNavigate('inventory')}
        />

        <StatCard
          title="Open Requests"
          value={openRequests.length}
          subtitle={`${criticalRequests.length} flagged as critical emergency`}
          icon={SendHorizontal}
          color="amber"
          badge={{ text: `${criticalRequests.length} Critical`, variant: 'negative' }}
          onClick={() => onNavigate('requests')}
        />

        <StatCard
          title="Shortage / Stale Alerts"
          value={alerts.length}
          subtitle={`${lowStockItems.length} low stock • ${staleStockItems.length} stale reports`}
          icon={AlertTriangle}
          color="rose"
          badge={{ text: 'Needs Review', variant: 'warning' }}
          onClick={() => onNavigate('alerts')}
        />
      </div>

      {/* Active Shortage Urgency Banner if critical requests exist */}
      {criticalRequests.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl flex-shrink-0 animate-bounce">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-950 text-sm">
                  {criticalRequests.length} Active Critical Medicine Shortage{criticalRequests.length > 1 ? 's' : ''}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                  Immediate Action Required
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                ICU and Emergency units are actively coordinating stock for Ceftriaxone & Meropenem.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('requests')}
            className="whitespace-nowrap px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            Review Urgent Shortages
          </button>
        </div>
      )}

      {/* Two Column Layout: Recent Requests & Recent Stock Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Medicine Requests */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Shortage Requests</h3>
                <p className="text-xs text-slate-500">Live requests submitted by participating facilities</p>
              </div>
              <button
                onClick={() => onNavigate('requests')}
                className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1"
              >
                <span>View All ({requests.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentRequests.map((req) => {
                const med = StorageService.getMedicineById(req.medicineId);
                const reqFac = StorageService.getFacilityById(req.requestingFacilityId);

                return (
                  <div key={req.id} className="py-3.5 flex items-start justify-between gap-3 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {med?.displayName || 'Medicine'}
                        </span>
                        {urgencyBadge(req.urgency)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{req.requestedQuantity} units</span>
                        <span>•</span>
                        <span className="truncate">{reqFac?.name || 'Clinic'}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(req.createdTimestamp)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {statusBadge(req.status)}
                      <span className="text-[10px] text-slate-400 font-mono">#{req.id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('requests')}
              className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Manage Shortage Requests & Confirmations</span>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Recent Stock Updates */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Inventory Updates</h3>
                <p className="text-xs text-slate-500">Latest stock movements reported by pharmacies</p>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1"
              >
                <span>View Full Inventory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentStockUpdates.map((item) => {
                const med = StorageService.getMedicineById(item.medicineId);
                const fac = StorageService.getFacilityById(item.facilityId);

                return (
                  <div key={item.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {med?.displayName || 'Medicine'}
                        </span>
                        {item.stockStatus === 'out_of_stock' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Stockout
                          </span>
                        ) : item.stockStatus === 'low_stock' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Low ({item.availableQuantity})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            In Stock ({item.availableQuantity})
                          </span>
                        )}
                        {item.verificationStatus === 'stale' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                            Stale
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="truncate">{fac?.name} ({fac?.area})</span>
                        <span>•</span>
                        <span>₹{item.unitPriceINR} / unit</span>
                        <span>•</span>
                        <span>{formatRelativeTime(item.lastUpdated)}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-slate-900">
                        {item.availableQuantity} units
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Batch: {item.batchNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('search')}
              className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Search Nearest Available Stock</span>
              <Search className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
