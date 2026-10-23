export type UserRole = 'pharmacy' | 'clinic';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  facilityId: string;
}

export type FacilityType = 'pharmacy' | 'clinic' | 'hospital';
export type VerificationStatus = 'verified' | 'pending' | 'unverified';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  area: string;
  city: string;
  phone: string;
  email: string;
  contactPerson: string;
  lat: number;
  lng: number;
  verificationStatus: VerificationStatus;
}

export type DosageForm = 
  | 'Tablet' 
  | 'Capsule' 
  | 'Injection / Vial' 
  | 'Syrup / Oral Liquid' 
  | 'Inhaler / Respule' 
  | 'IV Infusion' 
  | 'Ointment / Gel' 
  | 'Oral Powder / Sachet';

export interface Medicine {
  id: string;
  displayName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: DosageForm;
  packSizeUnit: string;
  therapeuticCategory: string;
  isEssential: boolean; // WHO / National List of Essential Medicines (NLEM)
  scheduleDrug?: string; // e.g. Schedule H, Schedule H1
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryItem {
  id: string;
  facilityId: string;
  medicineId: string;
  availableQuantity: number;
  lowStockThreshold: number;
  lastUpdated: string; // ISO 8601
  stockStatus: StockStatus;
  verificationStatus: 'verified' | 'unverified' | 'stale';
  unitPriceINR: number;
  batchNumber?: string;
  expiryDate?: string;
}

export type RequestUrgency = 'normal' | 'urgent' | 'critical';
export type RequestStatus = 
  | 'open' 
  | 'supplier_contacted' 
  | 'availability_confirmed' 
  | 'fulfilled' 
  | 'cancelled';

export interface StockRequest {
  id: string;
  requestingFacilityId: string;
  medicineId: string;
  requestedQuantity: number;
  urgency: RequestUrgency;
  createdTimestamp: string;
  status: RequestStatus;
  notes?: string;
  targetSupplierId?: string;
  requiredByDate?: string;
}

export type SupplierResponseStatus = 'accepted' | 'declined' | 'partially_available';

export interface SupplierResponse {
  id: string;
  requestId: string;
  supplierFacilityId: string;
  responseStatus: SupplierResponseStatus;
  responseTimestamp: string;
  confirmedQuantity?: number;
  estimatedDeliveryHours?: number;
  responseNotes?: string;
}

export interface ShortageAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'stale_inventory' | 'unresponded_request';
  facilityId: string;
  medicineId?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  isResolved?: boolean;
}

export interface SupplierMatchResult {
  inventoryItem: InventoryItem;
  facility: Facility;
  medicine: Medicine;
  score: number;
  distanceKm: number;
  freshnessHours: number;
  matchReasons: string[];
  isSufficientQty: boolean;
  isStale: boolean;
}

export interface SmartSearchParsedQuery {
  rawQuery: string;
  medicineName?: string;
  strength?: string;
  dosageForm?: string;
  quantity?: number;
  location?: string;
  urgency?: RequestUrgency;
  confidence: number;
  clarificationsNeeded: string[];
}

export interface ShortageInsight {
  id: string;
  type: 'recurring_shortage' | 'stale_supplier' | 'cluster_demand' | 'supply_imbalance';
  title: string;
  summary: string;
  affectedMedicines: string[];
  evidence: string[];
  severity: 'low' | 'medium' | 'high';
  actionRecommendation: string;
}
