import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Sparkles, 
  Phone, 
  Mail, 
  SendHorizontal, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Info, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  Pill,
  HelpCircle
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AIService } from '../services/aiService';
import { calculateDistanceKm, rankCandidateSuppliers } from '../services/matchingEngine';
import { Modal } from '../components/Modal';
import { User, Medicine, Facility, InventoryItem, DosageForm, RequestUrgency } from '../types';

interface SearchPageProps {
  currentUser: User;
  onNavigateToRequests: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  currentUser,
  onNavigateToRequests,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormulation, setSelectedFormulation] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(25); // Max radius
  const [freshOnly, setFreshOnly] = useState<boolean>(false);
  const [minQuantity, setMinQuantity] = useState<number>(1);

  // Modals
  const [contactSupplier, setContactSupplier] = useState<Facility | null>(null);
  const [requestModalItem, setRequestModalItem] = useState<{
    medicine: Medicine;
    inventoryItem?: InventoryItem;
    supplier?: Facility;
  } | null>(null);

  // Request form state
  const [reqQuantity, setReqQuantity] = useState<number>(20);
  const [reqUrgency, setReqUrgency] = useState<RequestUrgency>('urgent');
  const [reqNotes, setReqNotes] = useState<string>('');
  const [requestSubmittedId, setRequestSubmittedId] = useState<string | null>(null);

  const facilities = StorageService.getFacilities();
  const medicines = StorageService.getMedicines();
  const inventory = StorageService.getInventory();
  const currentFacility = StorageService.getFacilityById(currentUser.facilityId);

  // Reference origin point for distance
  const userLat = currentFacility?.lat || 12.9719;
  const userLng = currentFacility?.lng || 77.6412;

  // AI Natural Language Parse
  const parsedAIQuery = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return AIService.parseSearchQuery(searchQuery);
  }, [searchQuery]);

  // Unique areas for filter
  const areas = useMemo(() => {
    const list = facilities.map((f) => f.area);
    return Array.from(new Set(list));
  }, [facilities]);

  // Dosage form options
  const dosageForms: DosageForm[] = [
    'Tablet',
    'Capsule',
    'Injection / Vial',
    'Inhaler / Respule',
    'Syrup / Oral Liquid',
    'IV Infusion',
    'Oral Powder / Sachet',
  ];

  // Search Results Calculation
  const searchResults = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    const staleHoursThreshold = StorageService.getStaleHoursThreshold();
    const now = Date.now();

    return inventory
      .map((item) => {
        const med = medicines.find((m) => m.id === item.medicineId);
        const fac = facilities.find((f) => f.id === item.facilityId);
        if (!med || !fac) return null;

        const distanceKm = calculateDistanceKm(userLat, userLng, fac.lat, fac.lng);
        const updateAgeHours = Math.round((now - new Date(item.lastUpdated).getTime()) / (3600 * 1000));
        const isStale = updateAgeHours >= staleHoursThreshold;

        // Check if matches text query
        let matchesText = true;
        if (term) {
          const medName = med.displayName.toLowerCase();
          const active = med.activeIngredient.toLowerCase();
          const category = med.therapeuticCategory.toLowerCase();
          const facName = fac.name.toLowerCase();
          const facArea = fac.area.toLowerCase();

          // Direct match or match with AI parsed medicine
          const directMatch =
            medName.includes(term) ||
            active.includes(term) ||
            category.includes(term) ||
            facName.includes(term) ||
            facArea.includes(term);

          const aiMatch =
            parsedAIQuery?.medicineName &&
            med.displayName.toLowerCase().includes(parsedAIQuery.medicineName.toLowerCase());

          matchesText = directMatch || Boolean(aiMatch);
        }

        // Dosage filter
        if (selectedFormulation !== 'all' && med.dosageForm !== selectedFormulation) {
          return null;
        }

        // Area filter
        if (selectedArea !== 'all' && fac.area !== selectedArea) {
          return null;
        }

        // Stock status filter
        if (stockStatusFilter === 'in_stock' && item.stockStatus !== 'in_stock') {
          return null;
        }
        if (stockStatusFilter === 'low_stock' && item.stockStatus !== 'low_stock') {
          return null;
        }

        // Distance filter
        if (distanceKm > maxDistanceKm) {
          return null;
        }

        // Freshness filter
        if (freshOnly && isStale) {
          return null;
        }

        // Required quantity check
        if (minQuantity > 1 && item.availableQuantity < minQuantity) {
          // If strictly looking for sufficient stock
        }

        if (!matchesText) return null;

        // Calculate relevance match score
        let score = 50;
        if (item.availableQuantity >= minQuantity) score += 30;
        if (distanceKm < 5) score += 20;
        else if (distanceKm < 10) score += 10;
        if (!isStale) score += 10;

        return {
          item,
          med,
          fac,
          distanceKm,
          updateAgeHours,
          isStale,
          score,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.score || 0) - (a?.score || 0));
  }, [
    searchQuery,
    selectedFormulation,
    selectedArea,
    stockStatusFilter,
    maxDistanceKm,
    freshOnly,
    minQuantity,
    inventory,
    medicines,
    facilities,
    userLat,
    userLng,
    parsedAIQuery,
  ]);

  const handleApplyExample = (text: string) => {
    setSearchQuery(text);
  };

  const handleOpenRequestModal = (med: Medicine, item?: InventoryItem, fac?: Facility) => {
    setRequestModalItem({ medicine: med, inventoryItem: item, supplier: fac });
    setReqQuantity(20);
    setReqUrgency('urgent');
    setReqNotes(`Stock procurement request for ${currentFacility?.name || 'Clinic'}.`);
    setRequestSubmittedId(null);
  };

  const handleSubmitShortageRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalItem) return;

    const newReq = StorageService.addRequest({
      requestingFacilityId: currentUser.facilityId,
      medicineId: requestModalItem.medicine.id,
      requestedQuantity: reqQuantity,
      urgency: reqUrgency,
      notes: reqNotes,
      targetSupplierId: requestModalItem.supplier?.id,
    });

    setRequestSubmittedId(newReq.id);
  };

  const formatRelativeTime = (hours: number) => {
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Search Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Smart Medicine Search & Supplier Discovery
          </h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            Bengaluru Coordination Mesh
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Searching relative to <strong className="text-slate-800">{currentFacility?.name || 'Clinic'}</strong> in {currentFacility?.area}. Calculated via exact formulation matching.
        </p>
      </div>

      {/* Main Search Box with AI Natural Language Assist */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Type medicine name (e.g. Paracetamol 650mg, Ceftriaxone 1g, Insulin) or natural query (e.g. 'urgent 30 vials ceftriaxone near Indiranagar')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 text-sm sm:text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>

        {/* AI Intent Interpretation Chip */}
        {parsedAIQuery && parsedAIQuery.confidence > 0.6 && (
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-2.5 text-xs">
            <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-purple-900">AI Query Parser: </span>
              <span className="text-purple-800">
                Identified formulation: <strong className="font-bold">{parsedAIQuery.medicineName}</strong>
                {parsedAIQuery.strength && ` • Strength: ${parsedAIQuery.strength}`}
                {parsedAIQuery.dosageForm && ` • Form: ${parsedAIQuery.dosageForm}`}
                {parsedAIQuery.location && ` • Near: ${parsedAIQuery.location}`}
                {parsedAIQuery.urgency && ` • Urgency: ${parsedAIQuery.urgency.toUpperCase()}`}
              </span>

              {parsedAIQuery.clarificationsNeeded.length > 0 && (
                <div className="mt-1 text-[11px] text-purple-700 font-medium">
                  {parsedAIQuery.clarificationsNeeded[0]}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Example Quick Search Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Quick Searches:</span>
          {[
            'Ceftriaxone 1g injection',
            'Human Regular Insulin Actrapid',
            'Paracetamol 650mg',
            'Meropenem 1g injection',
            'Salbutamol Inhaler',
            'Amoxicillin + Clavulanic Acid',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleApplyExample(chip)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 border border-slate-200/60 transition-colors text-[11px] font-medium"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Formulation Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Dosage Form
            </label>
            <select
              value={selectedFormulation}
              onChange={(e) => setSelectedFormulation(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium focus:outline-none"
            >
              <option value="all">All Formulations</option>
              {dosageForms.map((df) => (
                <option key={df} value={df}>{df}</option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Bengaluru District
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium focus:outline-none"
            >
              <option value="all">All Districts</option>
              {areas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Stock Availability
            </label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium focus:outline-none"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock Only</option>
              <option value="low_stock">Low Stock Only</option>
            </select>
          </div>

          {/* Max Distance Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase mb-1">
              <span>Radius</span>
              <span className="text-teal-700 font-bold">{maxDistanceKm} km</span>
            </div>
            <input
              type="range"
              min="2"
              max="35"
              step="1"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(parseInt(e.target.value))}
              className="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg cursor-pointer mt-1"
            />
          </div>

          {/* Freshness Checkbox */}
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="freshOnly"
              checked={freshOnly}
              onChange={(e) => setFreshOnly(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label htmlFor="freshOnly" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Verified Stock Only (&lt;24h)
            </label>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Showing {searchResults.length} Candidate Supplier Listing{searchResults.length === 1 ? '' : 's'}
        </p>
        <span className="text-xs text-slate-400">
          Ranked by Formulation Match • Proximity • Stock Quantity • Freshness
        </span>
      </div>

      {/* Results Grid / List */}
      {searchResults.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Matching Medicine Stock Found</h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            We couldn't find available inventory matching your exact criteria within {maxDistanceKm} km. 
            Remember: MedStock AI does not automatically substitute alternative formulations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setMaxDistanceKm(35);
                setSelectedFormulation('all');
                setSelectedArea('all');
                setSearchQuery('');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
            >
              Reset Filters & Expand Radius
            </button>

            <button
              onClick={() => {
                // Pre-fill generic request
                handleOpenRequestModal(medicines[0]);
              }}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Broadcast Open Shortage Request
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {searchResults.map((result) => {
            if (!result) return null;
            const { item, med, fac, distanceKm, updateAgeHours, isStale, score } = result;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Medicine & Formulation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-base font-bold text-slate-900">
                      {med.displayName}
                    </h3>

                    {/* Stock Status Pill */}
                    {item.stockStatus === 'out_of_stock' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        Out of Stock
                      </span>
                    ) : item.stockStatus === 'low_stock' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                        Low Stock ({item.availableQuantity} left)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        In Stock ({item.availableQuantity} available)
                      </span>
                    )}

                    {/* Freshness Badge */}
                    {isStale ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Stale ({updateAgeHours}h old - Unverified)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Fresh Report
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mb-2 font-medium">
                    Active: <span className="text-slate-800">{med.activeIngredient}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{med.dosageForm}</span>
                    <span>•</span>
                    <span>Strength: {med.strength}</span>
                    <span>•</span>
                    <span>Pack: {med.packSizeUnit}</span>
                    <span>•</span>
                    <span className="font-semibold text-teal-800">₹{item.unitPriceINR} / unit</span>
                  </div>
                </div>

                {/* Supplier Facility & Distance Card */}
                <div className="lg:w-72 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 truncate">{fac.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 flex-shrink-0">
                        {distanceKm} km
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{fac.address}, {fac.area}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>Updated {formatRelativeTime(updateAgeHours)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row lg:flex-col items-center justify-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleOpenRequestModal(med, item, fac)}
                    className="w-full sm:w-auto lg:w-36 py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>Request Stock</span>
                  </button>

                  <button
                    onClick={() => setContactSupplier(fac)}
                    className="w-full sm:w-auto lg:w-36 py-2 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Contact Supplier</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supplier Contact Info Modal */}
      <Modal
        isOpen={contactSupplier !== null}
        onClose={() => setContactSupplier(null)}
        title={contactSupplier?.name || 'Supplier Contact'}
        subtitle={`Demo Pharmacy Provider • ${contactSupplier?.area}, ${contactSupplier?.city}`}
        maxWidth="md"
      >
        {contactSupplier && (
          <div className="space-y-4">
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-xs text-teal-900 leading-relaxed">
              <strong className="font-semibold">Verification Step:</strong> Per MedStock AI safety protocol, please call or WhatsApp the lead pharmacist to physically confirm batch availability and temperature-controlled storage before dispatch.
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <Building2 className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Pharmacy Address</p>
                  <p className="text-slate-600">{contactSupplier.address}, {contactSupplier.area}, {contactSupplier.city}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <Phone className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Direct Telephone / WhatsApp</p>
                  <a href={`tel:${contactSupplier.phone}`} className="text-teal-600 font-bold hover:underline">
                    {contactSupplier.phone}
                  </a>
                  <p className="text-[11px] text-slate-400 mt-0.5">Contact: {contactSupplier.contactPerson}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <Mail className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Verified Email Desk</p>
                  <a href={`mailto:${contactSupplier.email}`} className="text-teal-600 font-medium hover:underline">
                    {contactSupplier.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setContactSupplier(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit Shortage Request Modal */}
      <Modal
        isOpen={requestModalItem !== null}
        onClose={() => {
          setRequestModalItem(null);
          setRequestSubmittedId(null);
        }}
        title={requestSubmittedId ? 'Shortage Request Transmitted!' : 'Submit Medicine Shortage Request'}
        subtitle={
          requestSubmittedId
            ? `Request #${requestSubmittedId} has been logged in coordination pipeline.`
            : `Requesting ${requestModalItem?.medicine.displayName}`
        }
        maxWidth="lg"
      >
        {requestSubmittedId ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Request Registered Successfully</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Your emergency request is now tracked in the platform. The supplier has been notified to verify physical batch stock.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-center gap-3">
              <button
                onClick={() => {
                  setRequestModalItem(null);
                  setRequestSubmittedId(null);
                  onNavigateToRequests();
                }}
                className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs"
              >
                Go to Shortage Requests Desk
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitShortageRequest} className="space-y-4 text-xs">
            {/* Target medicine specs */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">{requestModalItem?.medicine.displayName}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                  {requestModalItem?.medicine.strength}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{requestModalItem?.medicine.activeIngredient}</p>
              {requestModalItem?.supplier && (
                <p className="text-[11px] text-teal-700 font-semibold mt-1">
                  Target Supplier: {requestModalItem.supplier.name} ({requestModalItem.supplier.area})
                </p>
              )}
            </div>

            {/* Quantity & Urgency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity Needed *</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(parseInt(e.target.value) || 1)}
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
                  <option value="normal">Routine / OPD Shift</option>
                  <option value="urgent">Urgent (&lt; 6 Hours)</option>
                  <option value="critical">Critical / ICU Emergency (&lt; 2 Hours)</option>
                </select>
              </div>
            </div>

            {/* Clinical Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clinical Notes & Department</label>
              <textarea
                rows={3}
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                placeholder="e.g. ICU patient admitted with septic shock. Urgent courier needed."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRequestModalItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
              >
                Send Shortage Request
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
