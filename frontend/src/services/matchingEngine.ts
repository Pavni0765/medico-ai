import { Facility, Medicine, InventoryItem, SupplierMatchResult } from '../types';
import { StorageService } from './storageService';

// Haversine distance calculation in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

export interface MatchOptions {
  requestingFacilityId: string;
  medicineId: string;
  requestedQuantity: number;
}

export function rankCandidateSuppliers(options: MatchOptions): SupplierMatchResult[] {
  const { requestingFacilityId, medicineId, requestedQuantity } = options;
  const targetMedicine = StorageService.getMedicineById(medicineId);
  const requestingFacility = StorageService.getFacilityById(requestingFacilityId);

  if (!targetMedicine || !requestingFacility) {
    return [];
  }

  const inventory = StorageService.getInventory();
  const facilities = StorageService.getFacilities();
  const staleHoursThreshold = StorageService.getStaleHoursThreshold();
  const now = Date.now();

  // Find all inventory items for this EXACT medicine ID (Safety rule: Do not substitute)
  const candidateItems = inventory.filter(
    (item) => item.medicineId === medicineId && item.facilityId !== requestingFacilityId
  );

  const results: SupplierMatchResult[] = [];

  for (const item of candidateItems) {
    const supplierFacility = facilities.find((f) => f.id === item.facilityId);
    if (!supplierFacility) continue;

    // Distance calculation
    const distanceKm = calculateDistanceKm(
      requestingFacility.lat,
      requestingFacility.lng,
      supplierFacility.lat,
      supplierFacility.lng
    );

    // Freshness calculation
    const updatedTime = new Date(item.lastUpdated).getTime();
    const freshnessHours = Math.max(0, Math.round((now - updatedTime) / (3600 * 1000)));
    const isStale = freshnessHours >= staleHoursThreshold;

    const isSufficientQty = item.availableQuantity >= requestedQuantity;
    const isZeroStock = item.availableQuantity === 0;

    // Strict Multi-Factor Scoring
    let score = 50; // base score
    const matchReasons: string[] = [];

    // 1. Exact medicine & formulation match
    score += 30;
    matchReasons.push(`Exact formulation: ${targetMedicine.displayName} (${targetMedicine.strength}, ${targetMedicine.dosageForm})`);

    // 2. Quantity sufficiency
    if (isZeroStock) {
      score -= 80;
      matchReasons.push(`Out of stock reported (0 units available)`);
    } else if (isSufficientQty) {
      score += 25;
      matchReasons.push(`Sufficient quantity: ${item.availableQuantity} units reported (Needed: ${requestedQuantity})`);
    } else {
      score += 10;
      matchReasons.push(`Partial quantity: ${item.availableQuantity} of ${requestedQuantity} units reported`);
    }

    // 3. Proximity
    if (distanceKm <= 3.0) {
      score += 25;
      matchReasons.push(`Proximity: Only ${distanceKm} km away in ${supplierFacility.area}`);
    } else if (distanceKm <= 8.0) {
      score += 15;
      matchReasons.push(`Moderate distance: ${distanceKm} km in ${supplierFacility.area}`);
    } else {
      score += 5;
      matchReasons.push(`Distance: ${distanceKm} km away`);
    }

    // 4. Freshness
    if (freshnessHours < 3) {
      score += 15;
      matchReasons.push(`High freshness: Stock updated ${freshnessHours === 0 ? 'just now' : `${freshnessHours}h ago`}`);
    } else if (freshnessHours < 12) {
      score += 8;
      matchReasons.push(`Updated ${freshnessHours}h ago`);
    } else if (isStale) {
      score -= 20;
      matchReasons.push(`Unverified stock: Report is ${freshnessHours}h old (> ${staleHoursThreshold}h threshold)`);
    }

    // Always append safety requirement
    matchReasons.push(`Requires supplier confirmation before dispatch`);

    results.push({
      inventoryItem: item,
      facility: supplierFacility,
      medicine: targetMedicine,
      score: Math.max(0, Math.min(100, score)),
      distanceKm,
      freshnessHours,
      matchReasons,
      isSufficientQty,
      isStale,
    });
  }

  // Sort candidates by score descending, then by distance ascending
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.distanceKm - b.distanceKm;
  });

  return results;
}
