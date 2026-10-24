// Comprehensive MedStock AI Automated Test Suite
import { StorageService } from './services/storageService';
import { AIService } from './services/aiService';
import { rankCandidateSuppliers, calculateDistanceKm } from './services/matchingEngine';

// In-memory mock of browser LocalStorage
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Attach mock localStorage to global if running in Node
if (typeof window === 'undefined' || !window.localStorage) {
  (globalThis as any).localStorage = new MockLocalStorage();
}

console.log('====================================================');
console.log('🏥 MEDSTOCK AI — AUTOMATED VERIFICATION TEST SUITE');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

// TEST 1: Storage Initialization & Seed Data Validation
console.log('--- TEST 1: Storage Initialization & Demo Seed Dataset ---');
StorageService.init();

const facilities = StorageService.getFacilities();
const medicines = StorageService.getMedicines();
const inventory = StorageService.getInventory();
const requests = StorageService.getRequests();

const pharmacies = facilities.filter((f) => f.type === 'pharmacy');
const clinics = facilities.filter((f) => f.type === 'clinic' || f.type === 'hospital');

assert(pharmacies.length >= 8, `At least 8 pharmacies seeded (Found: ${pharmacies.length})`);
assert(clinics.length >= 3, `At least 3 clinics/hospitals seeded (Found: ${clinics.length})`);
assert(medicines.length >= 15, `At least 15 essential medicines seeded (Found: ${medicines.length})`);
assert(inventory.length >= 15, `Varied inventory listings populated (Found: ${inventory.length})`);
assert(requests.length >= 6, `At least 6 initial sample requests seeded (Found: ${requests.length})`);

// TEST 2: Reset Demo Data
console.log('\n--- TEST 2: Reset Demo Data Capability ---');
StorageService.resetDemoData();
const resetInventory = StorageService.getInventory();
assert(resetInventory.length === inventory.length, 'Reset data cleanly restored all initial listings');

// TEST 3: Inventory Management CRUD & Persistence
console.log('\n--- TEST 3: Medicine Inventory Management & Persistence ---');
const testMed = medicines[0];
const testPharmacy = pharmacies[0];

const newItem = StorageService.addInventoryItem({
  facilityId: testPharmacy.id,
  medicineId: testMed.id,
  availableQuantity: 40,
  lowStockThreshold: 10,
  unitPriceINR: 195,
  batchNumber: 'TST-BATCH-001',
  expiryDate: '2026-12-31',
});

assert(Boolean(newItem.id), `Successfully added new inventory listing with ID ${newItem.id}`);
assert(newItem.stockStatus === 'in_stock', `Stock status calculated as 'in_stock'`);

// Quick update quantity
const updated = StorageService.updateInventoryItem(newItem.id, {
  availableQuantity: 5, // below threshold of 10
});
assert(updated?.stockStatus === 'low_stock', `Automatic status transition to 'low_stock' when qty (5) <= threshold (10)`);

// Mark out of stock
const outOfStock = StorageService.updateInventoryItem(newItem.id, {
  availableQuantity: 0,
});
assert(outOfStock?.stockStatus === 'out_of_stock', `Automatic status transition to 'out_of_stock' when qty = 0`);

// Simulated Page Reload / Browser Restart Persistence
console.log('\n--- TEST 4: Verification of Persistence Across Simulated Refresh ---');
const reloadedInventory = StorageService.getInventory();
const foundItem = reloadedInventory.find((i) => i.id === newItem.id);
assert(Boolean(foundItem), 'Newly created inventory item persisted in storage after re-fetch');
assert(foundItem?.availableQuantity === 0, 'Persisted correct updated quantity (0 units)');

// Clean up test item
StorageService.deleteInventoryItem(newItem.id);
assert(!StorageService.getInventory().some((i) => i.id === newItem.id), 'Successfully deleted test item');

// TEST 5: Smart Medicine Search & Typo Resilience
console.log('\n--- TEST 5: AI Smart Search & NLP Query Parsing ---');
const query1 = AIService.parseSearchQuery('need 30 vials ceftraxone 1g near Indiranagar urgent');
assert(query1.medicineName?.includes('Ceftriaxone') === true, `Correctly resolved misspelled 'ceftraxone' to 'Ceftriaxone'`);
assert(query1.strength === '1 g', `Extracted strength: ${query1.strength}`);
assert(query1.quantity === 30, `Extracted quantity: ${query1.quantity} units`);
assert(query1.location === 'Indiranagar', `Extracted location: ${query1.location}`);
assert(query1.urgency === 'urgent', `Extracted urgency: ${query1.urgency}`);

const query2 = AIService.parseSearchQuery('paracetmol 650mg 50 strips for emergency');
assert(query2.medicineName?.includes('Paracetamol') === true, `Correctly resolved 'paracetmol' to 'Paracetamol'`);
assert(query2.urgency === 'critical', `Detected 'emergency' as critical urgency`);

// TEST 6: 5-Factor Supplier Matching Algorithm
console.log('\n--- TEST 6: Multi-Factor Supplier Matching & Ranking ---');
const ceftriaxone = medicines.find((m) => m.displayName.includes('Ceftriaxone'))!;
const indiranagarClinic = clinics.find((c) => c.area === 'Indiranagar')!;

const rankedMatches = rankCandidateSuppliers({
  requestingFacilityId: indiranagarClinic.id,
  medicineId: ceftriaxone.id,
  requestedQuantity: 20,
});

assert(rankedMatches.length > 0, `Found ${rankedMatches.length} candidate suppliers for Ceftriaxone 1g`);
const topMatch = rankedMatches[0];
assert(topMatch.score > 70, `Top supplier scored high match score: ${topMatch.score}/100`);
assert(topMatch.matchReasons.length >= 3, `Supplied structured reasoning codes (${topMatch.matchReasons.length} reasons)`);
assert(
  topMatch.matchReasons.some((r) => r.includes('Exact formulation')),
  'Matched exact formulation reason code included'
);
assert(
  topMatch.matchReasons.some((r) => r.includes('Requires supplier confirmation')),
  'Mandatory safety confirmation notice enforced'
);

// TEST 7: Shortage Request Management Lifecycle
console.log('\n--- TEST 7: Shortage Request & Supplier Response Workflow ---');
const newRequest = StorageService.addRequest({
  requestingFacilityId: indiranagarClinic.id,
  medicineId: ceftriaxone.id,
  requestedQuantity: 25,
  urgency: 'critical',
  notes: 'Automated test suite request for ICU admission.',
});

assert(Boolean(newRequest.id), `Created new shortage request with ID ${newRequest.id}`);
assert(newRequest.status === 'open', `Initial status is 'open'`);

// Assign target supplier
StorageService.updateRequestStatus(newRequest.id, 'supplier_contacted', topMatch.facility.id);
let currentReq = StorageService.getRequestById(newRequest.id);
assert(currentReq?.status === 'supplier_contacted', `Status transitioned to 'supplier_contacted'`);

// Supplier confirms availability
const supplierResponse = StorageService.addSupplierResponse({
  requestId: newRequest.id,
  supplierFacilityId: topMatch.facility.id,
  responseStatus: 'accepted',
  confirmedQuantity: 25,
  estimatedDeliveryHours: 1,
  responseNotes: 'Batch verified. Priority ambulance runner ready.',
});

currentReq = StorageService.getRequestById(newRequest.id);
assert(currentReq?.status === 'availability_confirmed', `Status automatically updated to 'availability_confirmed' upon response`);

// Clinic marks fulfilled
StorageService.updateRequestStatus(newRequest.id, 'fulfilled');
currentReq = StorageService.getRequestById(newRequest.id);
assert(currentReq?.status === 'fulfilled', `Status successfully finalized to 'fulfilled'`);

// TEST 8: Stock Alerts Generation & Configurable Freshness
console.log('\n--- TEST 8: Live Alerts Generation & Freshness Threshold ---');
const initialAlerts = StorageService.getAlerts();
assert(initialAlerts.length > 0, `Generated ${initialAlerts.length} dynamic alerts from live state`);

const hasOosAlert = initialAlerts.some((a) => a.type === 'out_of_stock');
const hasStaleAlert = initialAlerts.some((a) => a.type === 'stale_inventory');
assert(hasOosAlert, 'Identified out-of-stock items in alerts feed');
assert(hasStaleAlert, 'Identified stale inventory reports (>24h) in alerts feed');

// Adjust threshold
StorageService.setStaleHoursThreshold(12); // stricter threshold
const stricterAlerts = StorageService.getAlerts();
assert(stricterAlerts.length >= initialAlerts.length, `Stricter freshness threshold (12h) identified more stale reports`);

// TEST 9: AI RFQ Message Generation
console.log('\n--- TEST 9: Standardized Clinical RFQ Generator ---');
const rfqText = AIService.generateSupplierRFQ(newRequest, ceftriaxone, indiranagarClinic, topMatch.facility);
assert(rfqText.includes('URGENT MEDICAL PROCUREMENT REQUEST'), 'Contains standardized emergency header');
assert(rfqText.includes(ceftriaxone.displayName), 'Preserved exact medicine name');
assert(rfqText.includes(ceftriaxone.strength), 'Preserved exact strength specification');
assert(rfqText.includes('STRICT - NO SUBSTITUTIONS'), 'Enforces zero unauthorized substitutions clinical rule');

console.log('\n====================================================');
console.log(`🏁 TEST SUITE FINISHED: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
