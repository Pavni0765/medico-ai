import React, { useState } from 'react';
import { 
  SendHorizontal, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Truck, 
  Building2, 
  Copy, 
  Check, 
  MessageSquare, 
  ChevronRight, 
  ShieldCheck, 
  Phone,
  Sparkles,
  Info
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { rankCandidateSuppliers } from '../services/matchingEngine';
import { AIService } from '../services/aiService';
import { Modal } from '../components/Modal';
import { User, StockRequest, Medicine, Facility, RequestUrgency, RequestStatus, SupplierMatchResult } from '../types';

interface RequestsPageProps {
  currentUser: User;
}

export const RequestsPage: React.FC<RequestsPageProps> = ({ currentUser }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'my_requests' | 'incoming'>(
    currentUser.role === 'clinic' ? 'my_requests' : 'incoming'
  );

  // New Request Modal
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  const [reqQty, setReqQty] = useState<number>(25);
  const [reqUrgency, setReqUrgency] = useState<RequestUrgency>('urgent');
  const [reqNotes, setReqNotes] = useState<string>('');

  // View Supplier Matching Modal
  const [matchingRequest, setMatchingRequest] = useState<StockRequest | null>(null);

  // AI RFQ Modal
  const [rfqModalData, setRfqModalData] = useState<{
    text: string;
    request: StockRequest;
  } | null>(null);
  const [copiedRfq, setCopiedRfq] = useState(false);

  const facilities = StorageService.getFacilities();
  const medicines = StorageService.getMedicines();
  const requests = StorageService.getRequests();
  const currentFacility = StorageService.getFacilityById(currentUser.facilityId);

  // Filter requests based on tab & status
  const filteredRequests = requests.filter((req) => {
    // Role & Tab scope
    if (activeTab === 'my_requests' && req.requestingFacilityId !== currentUser.facilityId) {
      return false;
    }
    if (activeTab === 'incoming') {
      // For pharmacy: targetSupplierId is their pharmacy, or open unassigned requests
      if (req.targetSupplierId && req.targetSupplierId !== currentUser.facilityId) {
        return false;
      }
    }

    // Status filter
    if (filterStatus !== 'all' && req.status !== filterStatus) {
      return false;
    }

    return true;
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId) return;

    StorageService.addRequest({
      requestingFacilityId: currentUser.facilityId,
      medicineId: selectedMedId,
      requestedQuantity: reqQty,
      urgency: reqUrgency,
      notes: reqNotes,
    });

    setNewRequestModalOpen(false);
    setSelectedMedId('');
    setReqNotes('');
  };

  const handleUpdateStatus = (reqId: string, newStatus: RequestStatus) => {
    StorageService.updateRequestStatus(reqId, newStatus);
  };

  const handlePharmacyConfirmStock = (req: StockRequest) => {
    StorageService.addSupplierResponse({
      requestId: req.id,
      supplierFacilityId: currentUser.facilityId,
      responseStatus: 'accepted',
      confirmedQuantity: req.requestedQuantity,
      estimatedDeliveryHours: 2,
      responseNotes: `Confirmed by ${currentUser.name} at ${currentFacility?.name}. Physical stock verified and reserved.`,
    });
  };

  const handlePharmacyDecline = (req: StockRequest) => {
    StorageService.addSupplierResponse({
      requestId: req.id,
      supplierFacilityId: currentUser.facilityId,
      responseStatus: 'declined',
      responseNotes: 'Current stock reserved for local inpatient prescriptions.',
    });
  };

  const handleOpenAiRfq = (req: StockRequest) => {
    const med = StorageService.getMedicineById(req.medicineId);
    const reqFac = StorageService.getFacilityById(req.requestingFacilityId);
    const targetSup = req.targetSupplierId ? StorageService.getFacilityById(req.targetSupplierId) : undefined;

    if (!med || !reqFac) return;

    const rfqText = AIService.generateSupplierRFQ(req, med, reqFac, targetSup);
    setRfqModalData({ text: rfqText, request: req });
    setCopiedRfq(false);
  };

  const handleCopyRfq = () => {
    if (!rfqModalData) return;
    navigator.clipboard.writeText(rfqModalData.text);
    setCopiedRfq(true);
    setTimeout(() => setCopiedRfq(false), 2500);
  };

  const getUrgencyBadge = (urgency: RequestUrgency) => {
    switch (urgency) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-600 text-white animate-pulse">Critical (Emergency)</span>;
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-white">Urgent (&lt; 6h)</span>;
      case 'normal':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">Routine</span>;
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Open (Pending Match)</span>;
      case 'supplier_contacted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Supplier Contacted</span>;
      case 'availability_confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Availability Confirmed</span>;
      case 'fulfilled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Fulfilled</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Cancelled</span>;
    }
  };

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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Shortage Request Management & Coordination
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Coordinate emergency medicine dispatches, match nearby candidate suppliers, and track RFQ statuses.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedMedId(medicines[0]?.id || '');
            setNewRequestModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Shortage Request</span>
        </button>
      </div>

      {/* Navigation tabs & filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab pills */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab('my_requests')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'my_requests'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Facility Requests ({requests.filter(r => r.requestingFacilityId === currentUser.facilityId).length})
          </button>

          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'incoming'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Incoming for My Pharmacy
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Network ({requests.length})
          </button>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Request Statuses</option>
            <option value="open">Open</option>
            <option value="supplier_contacted">Supplier Contacted</option>
            <option value="availability_confirmed">Availability Confirmed</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests Card List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <SendHorizontal className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">No Shortage Requests Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no active requests matching the selected tab or status filter.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const med = StorageService.getMedicineById(req.medicineId);
            const reqFac = StorageService.getFacilityById(req.requestingFacilityId);
            const targetSupplier = req.targetSupplierId ? StorageService.getFacilityById(req.targetSupplierId) : null;
            const responses = StorageService.getResponsesForRequest(req.id);
            const isMyRequest = req.requestingFacilityId === currentUser.facilityId;
            const isMyTargetPharmacy = currentUser.role === 'pharmacy' && req.targetSupplierId === currentUser.facilityId;

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                  req.urgency === 'critical' && req.status !== 'fulfilled'
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200/90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  
                  {/* Left: Medicine and Request Details */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        #{req.id}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {med?.displayName || 'Medicine'}
                      </h3>
                      {getUrgencyBadge(req.urgency)}
                      {getStatusBadge(req.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                      <div>
                        <span className="font-semibold text-slate-700">Quantity Needed: </span>
                        <strong className="text-slate-900">{req.requestedQuantity}</strong> {med?.packSizeUnit}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Requesting Facility: </span>
                        <span>{reqFac?.name} ({reqFac?.area})</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Formulation: </span>
                        <span>{med?.strength} • {med?.dosageForm}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Logged: </span>
                        <span>{formatRelativeTime(req.createdTimestamp)}</span>
                      </div>
                    </div>

                    {req.notes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 italic">
                        "{req.notes}"
                      </div>
                    )}

                    {/* Target Supplier & Responses Status */}
                    {targetSupplier && (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">Assigned Supplier:</span>
                        <span className="font-bold text-slate-900">{targetSupplier.name}</span>
                        <span className="text-slate-400">({targetSupplier.area})</span>
                      </div>
                    )}

                    {/* Responses timeline */}
                    {responses.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {responses.map((resp) => {
                          const respFac = StorageService.getFacilityById(resp.supplierFacilityId);
                          return (
                            <div
                              key={resp.id}
                              className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-start gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-bold text-emerald-950">{respFac?.name}: </span>
                                <span className="text-emerald-900">{resp.responseNotes}</span>
                                <div className="text-[10px] text-emerald-700 mt-0.5">
                                  Confirmed Qty: {resp.confirmedQuantity || req.requestedQuantity} units • Est. Delivery: {resp.estimatedDeliveryHours || 2} hours
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Actions & Multi-Factor Matching */}
                  <div className="flex flex-row lg:flex-col items-stretch lg:items-end gap-2 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    
                    {/* View Ranked Matches Button */}
                    <button
                      onClick={() => setMatchingRequest(req)}
                      className="py-2 px-3.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Match Nearby Suppliers</span>
                    </button>

                    {/* AI RFQ generator button */}
                    <button
                      onClick={() => handleOpenAiRfq(req)}
                      className="py-2 px-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                      <span>1-Click AI Supplier RFQ</span>
                    </button>

                    {/* Pharmacy Actions: Confirm or Decline */}
                    {currentUser.role === 'pharmacy' && req.status !== 'fulfilled' && req.status !== 'cancelled' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() => handlePharmacyConfirmStock(req)}
                          className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                        >
                          Confirm Stock
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'fulfilled')}
                          className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs"
                        >
                          Mark Fulfilled
                        </button>
                      </div>
                    )}

                    {/* Clinic Actions: Fulfil or Cancel */}
                    {isMyRequest && req.status !== 'fulfilled' && req.status !== 'cancelled' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'fulfilled')}
                          className="py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold"
                        >
                          Received & Fulfilled
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'cancelled')}
                          className="py-1.5 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Shortage Request Modal */}
      <Modal
        isOpen={newRequestModalOpen}
        onClose={() => setNewRequestModalOpen(false)}
        title="Create Emergency Medicine Shortage Request"
        subtitle={`Logged by ${currentFacility?.name || 'Clinic'} (${currentFacility?.area})`}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Essential Medicine *
            </label>
            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500/20"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} — {m.strength} ({m.dosageForm})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity Needed *</label>
              <input
                type="number"
                min="1"
                value={reqQty}
                onChange={(e) => setReqQty(parseInt(e.target.value) || 1)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clinical Urgency *</label>
              <select
                value={reqUrgency}
                onChange={(e) => setReqUrgency(e.target.value as RequestUrgency)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
              >
                <option value="normal">Routine Replenishment</option>
                <option value="urgent">Urgent (&lt; 6 Hours)</option>
                <option value="critical">Critical / ICU Emergency (&lt; 2 Hours)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clinical Notes & Justification</label>
            <textarea
              rows={3}
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
              placeholder="e.g. ICU patient admitted with multidrug-resistant infection. Immediate delivery needed."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewRequestModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
            >
              Log Shortage Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Matching Modal */}
      <Modal
        isOpen={matchingRequest !== null}
        onClose={() => setMatchingRequest(null)}
        title="Automated Multi-Factor Supplier Matching"
        subtitle={
          matchingRequest
            ? `Ranking candidate pharmacies for ${StorageService.getMedicineById(matchingRequest.medicineId)?.displayName}`
            : ''
        }
        maxWidth="2xl"
      >
        {matchingRequest && (
          <div className="space-y-4 text-xs">
            {/* Criteria explanation alert */}
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex items-start gap-2 text-teal-900 leading-relaxed">
              <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Matching Criteria:</strong> Candidate suppliers are ranked by:
                1. Exact formulation & strength match • 2. Sufficient reported quantity • 3. Geographic distance • 4. Inventory freshness.
                <span className="block mt-1 text-[11px] text-teal-800">
                  ⚠️ Note: High ranking does not replace physical verification. Supplier confirmation is mandatory.
                </span>
              </div>
            </div>

            {/* Candidate list */}
            {(() => {
              const matches = rankCandidateSuppliers({
                requestingFacilityId: matchingRequest.requestingFacilityId,
                medicineId: matchingRequest.medicineId,
                requestedQuantity: matchingRequest.requestedQuantity,
              });

              if (matches.length === 0) {
                return (
                  <div className="py-8 text-center text-slate-500">
                    <p className="font-semibold">No suppliers currently have recorded stock for this exact medicine.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Consider broadcasting this request across all participating network pharmacies.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {matches.map((match, idx) => (
                    <div
                      key={match.facility.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-xs">
                            Rank #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">{match.facility.name}</span>
                          <span className="text-slate-500">• {match.distanceKm} km ({match.facility.area})</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            Score: {match.score}/100
                          </span>
                        </div>

                        {/* Rationale list */}
                        <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                          {match.matchReasons.map((reason, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Select & Contact Action */}
                      <div className="flex sm:flex-col items-center justify-end gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            StorageService.updateRequestStatus(matchingRequest.id, 'supplier_contacted', match.facility.id);
                            setMatchingRequest(null);
                          }}
                          className="py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs"
                        >
                          Select & Contact
                        </button>
                        <a
                          href={`tel:${match.facility.phone}`}
                          className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>Call Pharmacy</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setMatchingRequest(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 1-Click AI RFQ Modal */}
      <Modal
        isOpen={rfqModalData !== null}
        onClose={() => setRfqModalData(null)}
        title="AI-Generated Supplier Procurement RFQ"
        subtitle="Standardized message for WhatsApp, Email, or Telephone coordination."
        maxWidth="lg"
      >
        {rfqModalData && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 leading-relaxed">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Standardized Clinical Accuracy</span>
              </div>
              This message preserves all exact formulation strengths and active ingredients without ambiguity. Send directly to supplier pharmacists.
            </div>

            <textarea
              readOnly
              rows={12}
              value={rfqModalData.text}
              className="w-full font-mono text-[11px] bg-slate-900 text-teal-300 p-4 rounded-xl border border-slate-700 leading-relaxed"
            />

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {copiedRfq ? 'Copied to clipboard!' : 'Ready for dispatch'}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyRfq}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs"
                >
                  {copiedRfq ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRfq ? 'Copied!' : 'Copy RFQ Text'}</span>
                </button>
                <button
                  onClick={() => setRfqModalData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
