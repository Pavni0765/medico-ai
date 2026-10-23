import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Filter, 
  ShieldAlert,
  ArrowUpDown,
  Building,
  Store,
  Tag,
  Check
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { StorageService } from '../services/storageService';
import { InventoryItem, Medicine, Facility, User, DosageForm } from '../types';

interface InventoryPageProps {
  currentUser: User;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'stale'>('all');
  const [viewScope, setViewScope] = useState<'my_facility' | 'all_network'>(
    currentUser.role === 'pharmacy' ? 'my_facility' : 'all_network'
  );

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    medicineId: '',
    customName: '',
    customActive: '',
    customStrength: '',
    customDosageForm: 'Tablet' as DosageForm,
    customPackUnit: 'Strip of 10 Tablets',
    customCategory: 'Essential Medicine',
    facilityId: currentUser.facilityId,
    availableQuantity: 50,
    lowStockThreshold: 15,
    unitPriceINR: 120,
    batchNumber: 'BT-2026-X',
    expiryDate: '2026-12-31',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const facilities = StorageService.getFacilities();
  const medicines = StorageService.getMedicines();
  const inventory = StorageService.getInventory();
  const currentFacility = StorageService.getFacilityById(currentUser.facilityId);

  // Filter items
  const filteredItems = inventory.filter((item) => {
    // Scope filter
    if (viewScope === 'my_facility' && item.facilityId !== currentUser.facilityId) {
      return false;
    }

    // Status filter
    if (statusFilter === 'in_stock' && item.stockStatus !== 'in_stock') return false;
    if (statusFilter === 'low_stock' && item.stockStatus !== 'low_stock') return false;
    if (statusFilter === 'out_of_stock' && item.stockStatus !== 'out_of_stock') return false;
    if (statusFilter === 'stale' && item.verificationStatus !== 'stale') return false;

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const med = medicines.find((m) => m.id === item.medicineId);
      const fac = facilities.find((f) => f.id === item.facilityId);
      const matchesMed = med?.displayName.toLowerCase().includes(term) || med?.activeIngredient.toLowerCase().includes(term);
      const matchesFac = fac?.name.toLowerCase().includes(term) || fac?.area.toLowerCase().includes(term);
      const matchesBatch = item.batchNumber?.toLowerCase().includes(term);
      return matchesMed || matchesFac || matchesBatch;
    }

    return true;
  });

  // Handle Quick Quantity Change
  const handleQuickQtyChange = (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.availableQuantity + delta);
    StorageService.updateInventoryItem(item.id, {
      availableQuantity: newQty,
    });
  };

  // Handle Mark Out of Stock
  const handleMarkOutOfStock = (item: InventoryItem) => {
    StorageService.updateInventoryItem(item.id, {
      availableQuantity: 0,
      stockStatus: 'out_of_stock',
    });
  };

  // Handle Re-Verify / Refresh Timestamp
  const handleVerifyNow = (item: InventoryItem) => {
    StorageService.updateInventoryItem(item.id, {
      lastUpdated: new Date().toISOString(),
      verificationStatus: 'verified',
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (item: InventoryItem) => {
    setEditItem(item);
    setFormData({
      medicineId: item.medicineId,
      customName: '',
      customActive: '',
      customStrength: '',
      customDosageForm: 'Tablet',
      customPackUnit: '',
      customCategory: '',
      facilityId: item.facilityId,
      availableQuantity: item.availableQuantity,
      lowStockThreshold: item.lowStockThreshold,
      unitPriceINR: item.unitPriceINR,
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate || '',
    });
    setFormErrors({});
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData({
      medicineId: medicines[0]?.id || '',
      customName: '',
      customActive: '',
      customStrength: '',
      customDosageForm: 'Tablet',
      customPackUnit: 'Strip of 10 Tablets',
      customCategory: 'General Essential Drug',
      facilityId: currentUser.facilityId,
      availableQuantity: 50,
      lowStockThreshold: 15,
      unitPriceINR: 120,
      batchNumber: `BT-${Math.floor(1000 + Math.random() * 9000)}-K`,
      expiryDate: '2026-12-31',
    });
    setFormErrors({});
    setAddModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (formData.availableQuantity < 0) {
      errors.availableQuantity = 'Quantity cannot be negative';
    }
    if (formData.lowStockThreshold < 0) {
      errors.lowStockThreshold = 'Threshold cannot be negative';
    }
    if (formData.unitPriceINR < 0) {
      errors.unitPriceINR = 'Price must be positive';
    }
    if (!formData.medicineId && !formData.customName.trim()) {
      errors.medicineId = 'Select a medicine or enter custom name';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let targetMedId = formData.medicineId;

    // If custom new medicine was entered
    if (targetMedId === 'NEW_CUSTOM') {
      const created = StorageService.addMedicine({
        displayName: formData.customName,
        activeIngredient: formData.customActive || formData.customName,
        strength: formData.customStrength || 'Standard',
        dosageForm: formData.customDosageForm,
        packSizeUnit: formData.customPackUnit,
        therapeuticCategory: formData.customCategory,
        isEssential: true,
      });
      targetMedId = created.id;
    }

    if (editItem) {
      // Update existing item
      StorageService.updateInventoryItem(editItem.id, {
        availableQuantity: Number(formData.availableQuantity),
        lowStockThreshold: Number(formData.lowStockThreshold),
        unitPriceINR: Number(formData.unitPriceINR),
        batchNumber: formData.batchNumber,
        expiryDate: formData.expiryDate,
      });
      setEditItem(null);
    } else {
      // Add new item
      StorageService.addInventoryItem({
        facilityId: formData.facilityId,
        medicineId: targetMedId,
        availableQuantity: Number(formData.availableQuantity),
        lowStockThreshold: Number(formData.lowStockThreshold),
        unitPriceINR: Number(formData.unitPriceINR),
        batchNumber: formData.batchNumber,
        expiryDate: formData.expiryDate,
      });
      setAddModalOpen(false);
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
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Medicine Inventory Management
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {currentUser.role === 'pharmacy' ? 'Pharmacy Dispensing Desk' : 'Network View'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Maintain stock quantities, batch details, low-stock thresholds, and physical inventory verification timestamps.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Medicine Listing</span>
        </button>
      </div>

      {/* Control bar: Search, filters, and scope toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by medicine name, generic ingredient, batch, or pharmacy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Scope and Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Scope Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setViewScope('my_facility')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  viewScope === 'my_facility'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Pharmacy ({currentFacility?.area || 'Active'})
              </button>
              <button
                onClick={() => setViewScope('all_network')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  viewScope === 'all_network'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Network ({inventory.length})
              </button>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="in_stock">In Stock Only</option>
                <option value="low_stock">Low Stock Only</option>
                <option value="out_of_stock">Out of Stock Only</option>
                <option value="stale">Stale (Unverified)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Medicine & Formulation</th>
                <th className="py-3.5 px-4">Dosage / Unit</th>
                <th className="py-3.5 px-4">Supplier & Location</th>
                <th className="py-3.5 px-4">Available Qty</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4">Last Verified</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No inventory listings found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search keywords, status filter, or add a new medicine listing.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const med = StorageService.getMedicineById(item.medicineId);
                  const fac = StorageService.getFacilityById(item.facilityId);
                  const isCurrentFacility = item.facilityId === currentUser.facilityId;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Medicine & Formulation */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {med?.displayName || 'Unknown Medicine'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {med?.activeIngredient}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Batch: {item.batchNumber || 'N/A'} • Exp: {item.expiryDate || 'N/A'}
                        </div>
                      </td>

                      {/* Dosage / Unit */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700">{med?.dosageForm}</span>
                        <div className="text-[11px] text-slate-500">{med?.packSizeUnit}</div>
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                          {med?.strength}
                        </span>
                      </td>

                      {/* Supplier & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{fac?.name}</div>
                        <div className="text-[11px] text-slate-500">{fac?.area}, {fac?.city}</div>
                      </td>

                      {/* Available Qty & Inline Quick Adjust */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 w-8 text-center">
                            {item.availableQuantity}
                          </span>

                          {/* Quick inline buttons if this belongs to current user's facility */}
                          {isCurrentFacility && (
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                onClick={() => handleQuickQtyChange(item, -5)}
                                className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                                title="Decrease by 5 units"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleQuickQtyChange(item, 10)}
                                className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                                title="Increase by 10 units"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Threshold: {item.lowStockThreshold} units
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        ₹{item.unitPriceINR}
                      </td>

                      {/* Stock Status */}
                      <td className="py-3.5 px-4">
                        {item.stockStatus === 'out_of_stock' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            Out of Stock
                          </span>
                        ) : item.stockStatus === 'low_stock' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Last Verified & Stale Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-600 font-medium">
                            {formatRelativeTime(item.lastUpdated)}
                          </span>
                        </div>
                        {item.verificationStatus === 'stale' ? (
                          <span className="mt-1 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Stale Report
                          </span>
                        ) : (
                          <span className="mt-1 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isCurrentFacility ? (
                            <>
                              <button
                                onClick={() => handleVerifyNow(item)}
                                className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                                title="Re-verify physical stock (updates timestamp to now)"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit listing details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMarkOutOfStock(item)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Mark as Out of Stock"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              View Only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Inventory Modal */}
      <Modal
        isOpen={addModalOpen || editItem !== null}
        onClose={() => {
          setAddModalOpen(false);
          setEditItem(null);
        }}
        title={editItem ? 'Edit Medicine Inventory Listing' : 'Add Medicine to Inventory'}
        subtitle={
          editItem
            ? 'Update available stock quantity, threshold, or batch information.'
            : 'List a new essential medicine batch for clinic discovery.'
        }
        maxWidth="lg"
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          
          {/* Medicine Selection (disabled in edit mode) */}
          {!editItem && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Catalog Medicine *
              </label>
              <select
                value={formData.medicineId}
                onChange={(e) => setFormData({ ...formData, medicineId: e.target.value })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} ({m.strength}, {m.dosageForm})
                  </option>
                ))}
                <option value="NEW_CUSTOM">+ Add Custom Medicine Listing</option>
              </select>
            </div>
          )}

          {/* If custom medicine selected */}
          {!editItem && formData.medicineId === 'NEW_CUSTOM' && (
            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-teal-900 mb-1">
                  Medicine Brand / Display Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cefixime 200mg"
                  value={formData.customName}
                  onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-teal-900 mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 200 mg"
                    value={formData.customStrength}
                    onChange={(e) => setFormData({ ...formData, customStrength: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-teal-900 mb-1">Dosage Form</label>
                  <select
                    value={formData.customDosageForm}
                    onChange={(e) => setFormData({ ...formData, customDosageForm: e.target.value as DosageForm })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Injection / Vial">Injection / Vial</option>
                    <option value="Inhaler / Respule">Inhaler / Respule</option>
                    <option value="Syrup / Oral Liquid">Syrup / Oral Liquid</option>
                    <option value="Oral Powder / Sachet">Oral Powder / Sachet</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Quantities & Thresholds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available Quantity (Units) *
              </label>
              <input
                type="number"
                min="0"
                value={formData.availableQuantity}
                onChange={(e) => setFormData({ ...formData, availableQuantity: parseInt(e.target.value) || 0 })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
              {formErrors.availableQuantity && (
                <p className="text-[11px] text-rose-600 mt-1">{formErrors.availableQuantity}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low-Stock Threshold *
              </label>
              <input
                type="number"
                min="0"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
              {formErrors.lowStockThreshold && (
                <p className="text-[11px] text-rose-600 mt-1">{formErrors.lowStockThreshold}</p>
              )}
            </div>
          </div>

          {/* Pricing & Batch */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Price (INR ₹) *
              </label>
              <input
                type="number"
                min="0"
                value={formData.unitPriceINR}
                onChange={(e) => setFormData({ ...formData, unitPriceINR: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Number
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setAddModalOpen(false);
                setEditItem(null);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
            >
              {editItem ? 'Save Changes' : 'Confirm Listing'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
