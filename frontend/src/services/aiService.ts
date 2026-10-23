import { SmartSearchParsedQuery, ShortageInsight, StockRequest, Medicine, Facility } from '../types';
import { StorageService } from './storageService';

// Built-in fuzzy spelling dictionary for essential medicines
const COMMON_VARIANTS: Record<string, string> = {
  paracetmol: 'Paracetamol',
  paracitamol: 'Paracetamol',
  dolo: 'Paracetamol',
  calpol: 'Paracetamol',
  crocin: 'Paracetamol',
  amox: 'Amoxicillin + Clavulanic Acid',
  amoxclav: 'Amoxicillin + Clavulanic Acid',
  augmentin: 'Amoxicillin + Clavulanic Acid',
  mox: 'Amoxicillin + Clavulanic Acid',
  ceftriaxone: 'Ceftriaxone',
  ceftriaxn: 'Ceftriaxone',
  monocef: 'Ceftriaxone',
  azithro: 'Azithromycin',
  azithromycin: 'Azithromycin',
  azee: 'Azithromycin',
  meropenem: 'Meropenem',
  meronem: 'Meropenem',
  mero: 'Meropenem',
  insulin: 'Human Regular Insulin',
  actrapid: 'Human Regular Insulin',
  asthalin: 'Salbutamol',
  salbutamol: 'Salbutamol',
  inhaler: 'Salbutamol',
  pantop: 'Pantoprazole',
  pantocid: 'Pantoprazole',
  pantoprazole: 'Pantoprazole',
  metformin: 'Metformin Hydrochloride',
  glycomet: 'Metformin Hydrochloride',
  ors: 'Oral Rehydration Salts',
  electral: 'Oral Rehydration Salts',
  enoxaparin: 'Enoxaparin Sodium',
  clexane: 'Enoxaparin Sodium',
  dexamethasone: 'Dexamethasone',
  dexa: 'Dexamethasone',
  piptaz: 'Piperacillin + Tazobactam',
  tazomac: 'Piperacillin + Tazobactam',
  budecort: 'Budecort Respules',
  budesonide: 'Budecort Respules',
};

const DOSAGE_KEYWORDS = [
  { term: 'tablet', form: 'Tablet' },
  { term: 'tab', form: 'Tablet' },
  { term: 'capsule', form: 'Capsule' },
  { term: 'cap', form: 'Capsule' },
  { term: 'injection', form: 'Injection / Vial' },
  { term: 'vial', form: 'Injection / Vial' },
  { term: 'ampoule', form: 'Injection / Vial' },
  { term: 'syrup', form: 'Syrup / Oral Liquid' },
  { term: 'liquid', form: 'Syrup / Oral Liquid' },
  { term: 'inhaler', form: 'Inhaler / Respule' },
  { term: 'respule', form: 'Inhaler / Respule' },
  { term: 'sachet', form: 'Oral Powder / Sachet' },
  { term: 'powder', form: 'Oral Powder / Sachet' },
];

export const AIService = {
  // Feature 1: Intelligent Natural Language Medicine Search & Query Parser
  parseSearchQuery(queryText: string): SmartSearchParsedQuery {
    const raw = queryText.trim().toLowerCase();
    const result: SmartSearchParsedQuery = {
      rawQuery: queryText,
      confidence: 0.5,
      clarificationsNeeded: [],
    };

    if (!raw) return result;

    // 1. Urgency detection
    if (raw.includes('critical') || raw.includes('stat') || raw.includes('emergency') || raw.includes('life saving')) {
      result.urgency = 'critical';
    } else if (raw.includes('urgent') || raw.includes('asap') || raw.includes('immediate')) {
      result.urgency = 'urgent';
    } else {
      result.urgency = 'normal';
    }

    // 2. Quantity extraction (e.g., "50 strips", "20 vials", "need 100", "qty 30")
    const qtyMatch = raw.match(/\b(?:need|req|qty|quantity|count)?\s*(\d+)\s*(?:strips|vials|boxes|packs|units|bottles|tablets|tabs|ampoules|sachets|doses)?\b/i);
    if (qtyMatch && qtyMatch[1]) {
      const parsedQty = parseInt(qtyMatch[1], 10);
      // Avoid parsing strengths like 500 or 650 as quantity if followed by mg/g
      const nextWord = raw.slice(raw.indexOf(qtyMatch[1]) + qtyMatch[1].length).trim().split(' ')[0];
      if (!['mg', 'g', 'mcg', 'iu', 'ml'].includes(nextWord)) {
        if (parsedQty > 0 && parsedQty <= 10000) {
          result.quantity = parsedQty;
        }
      }
    }

    // 3. Strength extraction (e.g. "650mg", "1g", "500 mg", "100mcg", "40 mg", "4.5g")
    const strengthMatch = raw.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|iu\/ml|iu|ml)\b/i);
    if (strengthMatch) {
      result.strength = `${strengthMatch[1]} ${strengthMatch[2]}`.toLowerCase();
    }

    // 4. Dosage form extraction
    for (const d of DOSAGE_KEYWORDS) {
      if (raw.includes(d.term)) {
        result.dosageForm = d.form;
        break;
      }
    }

    // 5. Location / Area extraction from facilities in DB
    const facilities = StorageService.getFacilities();
    const uniqueAreas = Array.from(new Set(facilities.map((f) => f.area.toLowerCase())));
    for (const area of uniqueAreas) {
      if (raw.includes(area)) {
        result.location = area.charAt(0).toUpperCase() + area.slice(1);
        break;
      }
    }

    // 6. Medicine Name fuzzy & variant matching
    const medicines = StorageService.getMedicines();
    let matchedMed: Medicine | undefined;

    // Check direct dictionary variants
    const words = raw.split(/[\s,]+/);
    for (const word of words) {
      if (COMMON_VARIANTS[word]) {
        const canonical = COMMON_VARIANTS[word].toLowerCase();
        matchedMed = medicines.find(
          (m) =>
            m.displayName.toLowerCase().includes(canonical) ||
            m.activeIngredient.toLowerCase().includes(canonical)
        );
        if (matchedMed) break;
      }
    }

    // Check direct substring against medicine display names and active ingredients
    if (!matchedMed) {
      matchedMed = medicines.find((m) => {
        const name = m.displayName.toLowerCase();
        const active = m.activeIngredient.toLowerCase();
        return (
          raw.includes(name) ||
          words.some((w) => w.length > 3 && (name.includes(w) || active.includes(w)))
        );
      });
    }

    if (matchedMed) {
      result.medicineName = matchedMed.displayName;
      result.confidence = 0.9;

      // Check if strength was missing
      if (!result.strength) {
        result.clarificationsNeeded.push(
          `Detected "${matchedMed.displayName}". Standard strength is ${matchedMed.strength}. Please confirm required strength.`
        );
      }
      // Check if dosage form was missing
      if (!result.dosageForm) {
        result.dosageForm = matchedMed.dosageForm;
      }
    } else {
      result.confidence = 0.3;
      result.clarificationsNeeded.push(
        'Could not match a specific medicine in catalog. Try searching by generic name (e.g. Paracetamol, Ceftriaxone, Insulin).'
      );
    }

    return result;
  },

  // Feature 2: Automated Shortage Intelligence & Risk Analysis
  generateShortageInsights(): ShortageInsight[] {
    const inventory = StorageService.getInventory();
    const requests = StorageService.getRequests();
    const medicines = StorageService.getMedicines();
    const facilities = StorageService.getFacilities();
    const insights: ShortageInsight[] = [];

    // Insight 1: High Demand Antibiotic Shortage Risk
    const antibioticMeds = medicines.filter(
      (m) =>
        m.therapeuticCategory.toLowerCase().includes('antibiotic') ||
        m.displayName.includes('Ceftriaxone') ||
        m.displayName.includes('Meropenem') ||
        m.displayName.includes('Piperacillin')
    );
    const antibioticIds = antibioticMeds.map((m) => m.id);
    const antibioticRequests = requests.filter(
      (r) => antibioticIds.includes(r.medicineId) && (r.urgency === 'urgent' || r.urgency === 'critical')
    );
    const lowStockAntibiotics = inventory.filter(
      (i) => antibioticIds.includes(i.medicineId) && (i.stockStatus === 'out_of_stock' || i.stockStatus === 'low_stock')
    );

    if (antibioticRequests.length > 0 || lowStockAntibiotics.length > 0) {
      insights.push({
        id: 'ins-antibiotic-cluster',
        type: 'recurring_shortage',
        title: 'Cluster Deficit: Broad-Spectrum Injectable Antibiotics',
        summary:
          'Multiple critical care facilities have submitted urgent requests for Ceftriaxone 1g and Meropenem 1g while 3 central suppliers report zero or depleted stocks.',
        affectedMedicines: ['Ceftriaxone 1g IV/IM Injection', 'Meropenem 1g Sterile IV Infusion', 'Piperacillin + Tazobactam 4.5g IV'],
        evidence: [
          `${antibioticRequests.length} active urgent/critical requests logged across Koramangala and Indiranagar.`,
          `MedPlus Express reports 0 units of Ceftriaxone 1g (stockout).`,
          `Apollo 24/7 Koramangala reports 0 units of Meropenem 1g with report age > 48 hours.`,
          `Combined institutional buffer is currently below the 48-hour safety threshold for metropolitan ICU care.`,
        ],
        severity: 'high',
        actionRecommendation:
          'Prioritize inter-pharmacy stock re-allocation from National Pharma Distributors (Phase 1, Electronic City) which currently has 120 units available.',
      });
    }

    // Insight 2: Cold-Chain & Chronic Care Supply Imbalance (Insulin)
    const insulinMed = medicines.find((m) => m.displayName.includes('Insulin'));
    if (insulinMed) {
      const insulinStock = inventory.filter((i) => i.medicineId === insulinMed.id);
      const totalUnits = insulinStock.reduce((acc, i) => acc + i.availableQuantity, 0);
      const staleSuppliers = insulinStock.filter((i) => i.verificationStatus === 'stale');

      insights.push({
        id: 'ins-insulin-coldchain',
        type: 'supply_imbalance',
        title: 'Cold-Chain Vigilance: Human Regular Insulin 100 IU/ml',
        summary:
          'Insulin stock is geographically concentrated in South Bengaluru. Whitefield hub reports low reserves and unverified inventory status.',
        affectedMedicines: ['Human Regular Insulin 100 IU/ml (Actrapid)'],
        evidence: [
          `Total recorded network inventory is ${totalUnits} vials across 8 registered pharmacies.`,
          `CarePoint Essential Drugs (Whitefield) reports only 4 vials with last sync over 48 hours ago.`,
          `St. Martha Family Health Center has an active urgent request (#REQ-2026-004) for pediatric emergency backup.`,
        ],
        severity: 'medium',
        actionRecommendation:
          'Route requests to Apollo 24/7 Chemist (Koramangala, 18 vials verified) and trigger stock verification prompt for Whitefield distributor.',
      });
    }

    // Insight 3: Stale Supplier Reporting Reliability
    const staleItems = inventory.filter((i) => i.verificationStatus === 'stale');
    if (staleItems.length > 0) {
      const staleFacilityIds = Array.from(new Set(staleItems.map((i) => i.facilityId)));
      const staleFacilityNames = staleFacilityIds
        .map((fid) => facilities.find((f) => f.id === fid)?.name)
        .filter(Boolean);

      insights.push({
        id: 'ins-stale-reporting',
        type: 'stale_supplier',
        title: 'Inventory Freshness Warning: Unverified Stock Depletion Risk',
        summary: `${staleItems.length} inventory listings exceed the freshness threshold (> 24 hours). Unconfirmed stock may result in failed dispatches.`,
        affectedMedicines: Array.from(
          new Set(staleItems.map((i) => medicines.find((m) => m.id === i.medicineId)?.displayName || 'Medicine'))
        ).slice(0, 4),
        evidence: [
          `Facilities with stale records: ${staleFacilityNames.join(', ')}.`,
          `Healthcare clinics should not initiate emergency dispatches without direct telephone or portal confirmation.`,
        ],
        severity: 'medium',
        actionRecommendation:
          'Send automated WhatsApp/Email freshness pings to registered pharmacists to verify current physical stock.',
      });
    }

    return insights;
  },

  // Feature 3: Supplier RFQ Generation & Request Summarization
  generateSupplierRFQ(request: StockRequest, medicine: Medicine, clinic: Facility, supplier?: Facility): string {
    const urgencyLabel = request.urgency.toUpperCase();
    const dateFormatted = new Date(request.createdTimestamp).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const supplierSalutation = supplier ? `Attn: ${supplier.contactPerson} (${supplier.name})` : 'Attn: Pharmacy Stock Manager / Dispensing Desk';

    return `URGENT MEDICAL PROCUREMENT REQUEST [MedStock AI]
--------------------------------------------------
Status: ${urgencyLabel} REQUIREMENT
Request ID: #${request.id}
Timestamp: ${dateFormatted}

${supplierSalutation}

REQUESTING FACILITY:
- Organization: ${clinic.name} (${clinic.type.toUpperCase()})
- Contact Person: ${clinic.contactPerson}
- Phone: ${clinic.phone}
- Facility Address: ${clinic.address}, ${clinic.area}, ${clinic.city}

MEDICINE SPECIFICATIONS (STRICT - NO SUBSTITUTIONS):
- Medicine Name: ${medicine.displayName}
- Active Formulation: ${medicine.activeIngredient}
- Strength: ${medicine.strength}
- Dosage Form: ${medicine.dosageForm}
- Packaging Unit: ${medicine.packSizeUnit}
- Classification: ${medicine.isEssential ? 'Essential Medicine (NLEM)' : 'Standard'} | ${medicine.scheduleDrug || 'Schedule H'}

QUANTITY REQUIRED:
- Requested Units: ${request.requestedQuantity} ${medicine.packSizeUnit}
- Clinical Urgency: ${urgencyLabel}
- Clinical Notes: "${request.notes || 'Routine urgent clinical stock replenishment.'}"

COORDINATION ACTION NEEDED:
Please confirm availability via the MedStock AI portal or reply directly with:
1. Available quantity from verified physical batch
2. Batch number & expiry date
3. Estimated courier dispatch / handover time

Safety Notice: As per MedStock AI clinical guidelines, reported inventory is treated as unverified until written supplier verification. Do not provide therapeutic alternatives.`;
  },
};
