import {
  Facility,
  Medicine,
  InventoryItem,
  StockRequest,
  SupplierResponse,
  User,
  ShortageAlert,
} from '../types';
import {
  SEED_FACILITIES,
  SEED_MEDICINES,
  SEED_INVENTORY,
  SEED_REQUESTS,
  SEED_RESPONSES,
  SEED_USERS,
} from '../data/seedData';

const KEYS = {
  FACILITIES: 'medstock_facilities_v1',
  MEDICINES: 'medstock_medicines_v1',
  INVENTORY: 'medstock_inventory_v1',
  REQUESTS: 'medstock_requests_v1',
  RESPONSES: 'medstock_responses_v1',
  CURRENT_USER: 'medstock_current_user_v1',
  STALE_HOURS_THRESHOLD: 'medstock_stale_threshold_hours_v1',
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export const subscribeToStorage = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((fn) => fn());
};

// Safe JSON fetch with fallback
function getJson<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
}

function setJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

export const StorageService = {
  // Initialize storage if empty
  init() {
    if (!localStorage.getItem(KEYS.FACILITIES)) {
      setJson(KEYS.FACILITIES, SEED_FACILITIES);
    }
    if (!localStorage.getItem(KEYS.MEDICINES)) {
      setJson(KEYS.MEDICINES, SEED_MEDICINES);
    }
    if (!localStorage.getItem(KEYS.INVENTORY)) {
      setJson(KEYS.INVENTORY, SEED_INVENTORY);
    }
    if (!localStorage.getItem(KEYS.REQUESTS)) {
      setJson(KEYS.REQUESTS, SEED_REQUESTS);
    }
    if (!localStorage.getItem(KEYS.RESPONSES)) {
      setJson(KEYS.RESPONSES, SEED_RESPONSES);
    }
    if (!localStorage.getItem(KEYS.CURRENT_USER)) {
      setJson(KEYS.CURRENT_USER, SEED_USERS[0]); // Default to Clinic: Dr. Priya Sundaram
    }
    if (!localStorage.getItem(KEYS.STALE_HOURS_THRESHOLD)) {
      setJson(KEYS.STALE_HOURS_THRESHOLD, 24); // Default 24 hours
    }
  },

  // Reset to original demo data
  resetDemoData() {
    localStorage.removeItem(KEYS.FACILITIES);
    localStorage.removeItem(KEYS.MEDICINES);
    localStorage.removeItem(KEYS.INVENTORY);
    localStorage.removeItem(KEYS.REQUESTS);
    localStorage.removeItem(KEYS.RESPONSES);
    localStorage.removeItem(KEYS.CURRENT_USER);
    localStorage.removeItem(KEYS.STALE_HOURS_THRESHOLD);

    setJson(KEYS.FACILITIES, SEED_FACILITIES);
    setJson(KEYS.MEDICINES, SEED_MEDICINES);
    setJson(KEYS.INVENTORY, SEED_INVENTORY);
    setJson(KEYS.REQUESTS, SEED_REQUESTS);
    setJson(KEYS.RESPONSES, SEED_RESPONSES);
    setJson(KEYS.CURRENT_USER, SEED_USERS[0]);
    setJson(KEYS.STALE_HOURS_THRESHOLD, 24);
    notifyListeners();
  },

  // Stale hours threshold
  getStaleHoursThreshold(): number {
    return getJson<number>(KEYS.STALE_HOURS_THRESHOLD, 24);
  },

  setStaleHoursThreshold(hours: number) {
    setJson(KEYS.STALE_HOURS_THRESHOLD, hours);
  },

  // User Management
  getCurrentUser(): User {
    this.init();
    return getJson<User>(KEYS.CURRENT_USER, SEED_USERS[0]);
  },

  setCurrentUser(user: User) {
    setJson(KEYS.CURRENT_USER, user);
  },

  getAvailableUsers(): User[] {
    return SEED_USERS;
  },

  // Facilities
  getFacilities(): Facility[] {
    this.init();
    return getJson<Facility[]>(KEYS.FACILITIES, SEED_FACILITIES);
  },

  getFacilityById(id: string): Facility | undefined {
    return this.getFacilities().find((f) => f.id === id);
  },

  // Medicines
  getMedicines(): Medicine[] {
    this.init();
    return getJson<Medicine[]>(KEYS.MEDICINES, SEED_MEDICINES);
  },

  getMedicineById(id: string): Medicine | undefined {
    return this.getMedicines().find((m) => m.id === id);
  },

  addMedicine(medicine: Omit<Medicine, 'id'>): Medicine {
    const list = this.getMedicines();
    const newMed: Medicine = {
      ...medicine,
      id: `med-${Date.now().toString(36)}`,
    };
    setJson(KEYS.MEDICINES, [newMed, ...list]);
    return newMed;
  },

  // Inventory
  getInventory(): InventoryItem[] {
    this.init();
    const staleHours = this.getStaleHoursThreshold();
    const now = Date.now();
    const items = getJson<InventoryItem[]>(KEYS.INVENTORY, SEED_INVENTORY);

    // Dynamically calibrate status and staleness
    return items.map((item) => {
      const updatedTime = new Date(item.lastUpdated).getTime();
      const ageHours = (now - updatedTime) / (3600 * 1000);
      const isStale = ageHours >= staleHours;

      let stockStatus = item.stockStatus;
      if (item.availableQuantity === 0) {
        stockStatus = 'out_of_stock';
      } else if (item.availableQuantity <= item.lowStockThreshold) {
        stockStatus = 'low_stock';
      } else {
        stockStatus = 'in_stock';
      }

      return {
        ...item,
        stockStatus,
        verificationStatus: isStale ? 'stale' : 'verified',
      };
    });
  },

  getInventoryItem(id: string): InventoryItem | undefined {
    return this.getInventory().find((item) => item.id === id);
  },

  getInventoryByFacility(facilityId: string): InventoryItem[] {
    return this.getInventory().filter((item) => item.facilityId === facilityId);
  },

  addInventoryItem(itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stockStatus' | 'verificationStatus'>): InventoryItem {
    const list = this.getInventory();
    const now = new Date().toISOString();
    let stockStatus: InventoryItem['stockStatus'] = 'in_stock';
    if (itemData.availableQuantity === 0) stockStatus = 'out_of_stock';
    else if (itemData.availableQuantity <= itemData.lowStockThreshold) stockStatus = 'low_stock';

    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now().toString(36)}`,
      lastUpdated: now,
      stockStatus,
      verificationStatus: 'verified',
    };

    setJson(KEYS.INVENTORY, [newItem, ...list]);
    return newItem;
  },

  updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
    const list = this.getInventory();
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const availableQuantity = updates.availableQuantity !== undefined ? updates.availableQuantity : existing.availableQuantity;
    const lowStockThreshold = updates.lowStockThreshold !== undefined ? updates.lowStockThreshold : existing.lowStockThreshold;

    let stockStatus = updates.stockStatus;
    if (!stockStatus) {
      if (availableQuantity === 0) stockStatus = 'out_of_stock';
      else if (availableQuantity <= lowStockThreshold) stockStatus = 'low_stock';
      else stockStatus = 'in_stock';
    }

    const updated: InventoryItem = {
      ...existing,
      ...updates,
      availableQuantity,
      lowStockThreshold,
      stockStatus,
      lastUpdated: new Date().toISOString(), // automatically bump timestamp
      verificationStatus: 'verified',
    };

    list[index] = updated;
    setJson(KEYS.INVENTORY, list);
    return updated;
  },

  deleteInventoryItem(id: string) {
    const list = this.getInventory().filter((i) => i.id !== id);
    setJson(KEYS.INVENTORY, list);
  },

  // Requests
  getRequests(): StockRequest[] {
    this.init();
    return getJson<StockRequest[]>(KEYS.REQUESTS, SEED_REQUESTS);
  },

  getRequestById(id: string): StockRequest | undefined {
    return this.getRequests().find((r) => r.id === id);
  },

  addRequest(reqData: Omit<StockRequest, 'id' | 'createdTimestamp' | 'status'>): StockRequest {
    const list = this.getRequests();
    const reqCount = list.length + 1;
    const newReq: StockRequest = {
      ...reqData,
      id: `REQ-2026-${String(reqCount).padStart(3, '0')}`,
      createdTimestamp: new Date().toISOString(),
      status: reqData.targetSupplierId ? 'supplier_contacted' : 'open',
    };
    setJson(KEYS.REQUESTS, [newReq, ...list]);
    return newReq;
  },

  updateRequestStatus(requestId: string, status: StockRequest['status'], targetSupplierId?: string) {
    const list = this.getRequests();
    const index = list.findIndex((r) => r.id === requestId);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      status,
      targetSupplierId: targetSupplierId || list[index].targetSupplierId,
    };
    setJson(KEYS.REQUESTS, list);
    return list[index];
  },

  // Supplier Responses
  getResponses(): SupplierResponse[] {
    this.init();
    return getJson<SupplierResponse[]>(KEYS.RESPONSES, SEED_RESPONSES);
  },

  getResponsesForRequest(requestId: string): SupplierResponse[] {
    return this.getResponses().filter((resp) => resp.requestId === requestId);
  },

  addSupplierResponse(responseData: Omit<SupplierResponse, 'id' | 'responseTimestamp'>): SupplierResponse {
    const list = this.getResponses();
    const newResp: SupplierResponse = {
      ...responseData,
      id: `resp-${Date.now().toString(36)}`,
      responseTimestamp: new Date().toISOString(),
    };
    setJson(KEYS.RESPONSES, [newResp, ...list]);

    // Also update corresponding request status
    if (responseData.responseStatus === 'accepted') {
      this.updateRequestStatus(responseData.requestId, 'availability_confirmed', responseData.supplierFacilityId);
    }

    return newResp;
  },

  // Alerts Generation from Live State
  getAlerts(): ShortageAlert[] {
    const inventory = this.getInventory();
    const medicines = this.getMedicines();
    const facilities = this.getFacilities();
    const requests = this.getRequests();
    const staleHours = this.getStaleHoursThreshold();
    const now = Date.now();
    const alerts: ShortageAlert[] = [];

    // 1. Out of stock inventory items
    inventory
      .filter((item) => item.availableQuantity === 0)
      .forEach((item) => {
        const med = medicines.find((m) => m.id === item.medicineId);
        const fac = facilities.find((f) => f.id === item.facilityId);
        alerts.push({
          id: `alert-oos-${item.id}`,
          type: 'out_of_stock',
          facilityId: item.facilityId,
          medicineId: item.medicineId,
          title: `Stockout: ${med?.displayName || 'Unknown Medicine'}`,
          message: `${fac?.name || 'Pharmacy'} has 0 units available. Needs restock coordinate.`,
          severity: 'critical',
          timestamp: item.lastUpdated,
        });
      });

    // 2. Low stock inventory items
    inventory
      .filter((item) => item.availableQuantity > 0 && item.availableQuantity <= item.lowStockThreshold)
      .forEach((item) => {
        const med = medicines.find((m) => m.id === item.medicineId);
        const fac = facilities.find((f) => f.id === item.facilityId);
        alerts.push({
          id: `alert-low-${item.id}`,
          type: 'low_stock',
          facilityId: item.facilityId,
          medicineId: item.medicineId,
          title: `Low Stock Alert: ${med?.displayName || 'Unknown Medicine'}`,
          message: `${fac?.name || 'Pharmacy'} reported only ${item.availableQuantity} units (Threshold: ${item.lowStockThreshold}).`,
          severity: 'warning',
          timestamp: item.lastUpdated,
        });
      });

    // 3. Stale inventory reports
    inventory
      .filter((item) => {
        const age = (now - new Date(item.lastUpdated).getTime()) / (3600 * 1000);
        return age >= staleHours;
      })
      .forEach((item) => {
        const med = medicines.find((m) => m.id === item.medicineId);
        const fac = facilities.find((f) => f.id === item.facilityId);
        const ageHours = Math.round((now - new Date(item.lastUpdated).getTime()) / (3600 * 1000));
        alerts.push({
          id: `alert-stale-${item.id}`,
          type: 'stale_inventory',
          facilityId: item.facilityId,
          medicineId: item.medicineId,
          title: `Stale Inventory: ${med?.displayName || 'Medicine'}`,
          message: `Last updated ${ageHours}h ago by ${fac?.name || 'Pharmacy'}. Marked unverified until confirmed.`,
          severity: 'warning',
          timestamp: item.lastUpdated,
        });
      });

    // 4. Open requests without supplier response > 2 hours
    requests
      .filter((r) => r.status === 'open' || (r.status === 'supplier_contacted' && !this.getResponsesForRequest(r.id).length))
      .forEach((req) => {
        const med = medicines.find((m) => m.id === req.medicineId);
        const fac = facilities.find((f) => f.id === req.requestingFacilityId);
        const ageHours = Math.round((now - new Date(req.createdTimestamp).getTime()) / (3600 * 1000));
        alerts.push({
          id: `alert-req-${req.id}`,
          type: 'unresponded_request',
          facilityId: req.requestingFacilityId,
          medicineId: req.medicineId,
          title: `Pending Response: Request #${req.id} (${req.urgency.toUpperCase()})`,
          message: `${fac?.name || 'Clinic'} requested ${req.requestedQuantity}x ${med?.displayName || 'Medicine'} ${ageHours}h ago without confirmation.`,
          severity: req.urgency === 'critical' ? 'critical' : 'info',
          timestamp: req.createdTimestamp,
        });
      });

    // Sort by timestamp descending
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
};
