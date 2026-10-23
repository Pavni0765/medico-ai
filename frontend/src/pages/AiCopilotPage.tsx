import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  SendHorizontal, 
  Copy, 
  Check, 
  CheckCircle2, 
  FileText, 
  Key, 
  Settings, 
  ChevronRight, 
  Activity,
  Layers,
  Info
} from 'lucide-react';
import { AIService } from '../services/aiService';
import { StorageService } from '../services/storageService';
import { ShortageInsight, SmartSearchParsedQuery } from '../types';
import { Modal } from '../components/Modal';

export const AiCopilotPage: React.FC = () => {
  // Playground state
  const [testQuery, setTestQuery] = useState('need 30 vials ceftraxone 1g near Indiranagar urgent');
  const [parsedResult, setParsedResult] = useState<SmartSearchParsedQuery | null>(
    AIService.parseSearchQuery('need 30 vials ceftraxone 1g near Indiranagar urgent')
  );

  // Shortage Insights State
  const [insights, setInsights] = useState<ShortageInsight[]>(AIService.generateShortageInsights());

  // RFQ Composer State
  const medicines = StorageService.getMedicines();
  const facilities = StorageService.getFacilities();
  const requests = StorageService.getRequests();

  const [rfqMedId, setRfqMedId] = useState(medicines[0]?.id || '');
  const [rfqClinicId, setRfqClinicId] = useState(facilities[0]?.id || '');
  const [rfqSupplierId, setRfqSupplierId] = useState(facilities.find(f => f.type === 'pharmacy')?.id || '');
  const [rfqQty, setRfqQty] = useState(25);
  const [generatedRfq, setGeneratedRfq] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelType, setModelType] = useState('rule_based');

  const handleRunParser = () => {
    const res = AIService.parseSearchQuery(testQuery);
    setParsedResult(res);
  };

  const handleRefreshInsights = () => {
    const res = AIService.generateShortageInsights();
    setInsights(res);
  };

  const handleGenerateRfq = () => {
    const med = StorageService.getMedicineById(rfqMedId);
    const clinic = StorageService.getFacilityById(rfqClinicId);
    const supplier = StorageService.getFacilityById(rfqSupplierId);

    if (!med || !clinic) return;

    const mockRequest = {
      id: `REQ-${Date.now().toString(36).toUpperCase()}`,
      requestingFacilityId: clinic.id,
      medicineId: med.id,
      requestedQuantity: rfqQty,
      urgency: 'urgent' as const,
      createdTimestamp: new Date().toISOString(),
      status: 'open' as const,
      notes: 'Urgent ward buffer replenishment for weekend emergency department admissions.',
    };

    const text = AIService.generateSupplierRFQ(mockRequest, med, clinic, supplier);
    setGeneratedRfq(text);
  };

  const handleCopyRfq = () => {
    navigator.clipboard.writeText(generatedRfq);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AI Shortage Intelligence Hub
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Deterministic + NLP Assist
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Explore intelligent medicine search parser, evidence-backed shortage insights, and automated supplier RFQ generation.
          </p>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          <span>AI Engine Settings</span>
        </button>
      </div>

      {/* Architecture Disclaimer */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-teal-50 to-sky-50 border border-purple-200/80 text-xs text-slate-700 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-purple-950">Architecture Guardrails: </span>
          MedStock AI prioritizes deterministic safety over generative hallucinations. AI is utilized strictly to parse messy user queries, detect recurrence clusters in recorded request logs, and compose standardized RFQs. <strong className="font-semibold text-slate-900">Medicine formulations, dosages, and stock verification are never hallucinated or auto-substituted.</strong>
        </div>
      </div>

      {/* Feature 1: Intelligent Search Query Parser */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
              01
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Natural Language Query Parser & Typo Tolerance
              </h3>
              <p className="text-xs text-slate-500">
                Extracts medicine name, strength, dosage, quantity, and location while correcting common phonetic misspellings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            placeholder="Test spelling variations (e.g. 'paracetmol', 'ceftraxone', 'amoxclav', 'asthalin')"
          />
          <button
            onClick={handleRunParser}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Parse Query</span>
          </button>
        </div>

        {/* Quick query presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Try Presets:</span>
          {[
            'urgent 30 vials ceftraxone 1g near Indiranagar',
            'paracetmol 650mg 50 strips for OPD',
            'human insulin actrapid 15 vials in Koramangala',
            'asthalin inhaler 20 units critical',
            'amoxclav 625mg 40 packs',
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setTestQuery(preset);
                setParsedResult(AIService.parseSearchQuery(preset));
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-[11px] font-medium transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Parsed Output Card */}
        {parsedResult && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Target Medicine</p>
              <p className="font-bold text-slate-900 mt-0.5">{parsedResult.medicineName || 'None'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Extracted Strength</p>
              <p className="font-bold text-teal-700 mt-0.5">{parsedResult.strength || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Dosage Form</p>
              <p className="font-bold text-slate-900 mt-0.5">{parsedResult.dosageForm || 'Defaulted'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Requested Quantity</p>
              <p className="font-bold text-slate-900 mt-0.5">{parsedResult.quantity ? `${parsedResult.quantity} units` : 'Not specified'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Location Target</p>
              <p className="font-bold text-slate-900 mt-0.5">{parsedResult.location || 'All areas'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Urgency Status</p>
              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase mt-0.5 ${
                parsedResult.urgency === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {parsedResult.urgency}
              </span>
            </div>

            {parsedResult.clarificationsNeeded.length > 0 && (
              <div className="col-span-full pt-2 mt-1 border-t border-slate-200 text-teal-800 text-[11px] font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <span>{parsedResult.clarificationsNeeded[0]}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature 2: Automated Shortage Insights & Risk Analysis */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
              02
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Evidence-Based Shortage Insights
              </h3>
              <p className="text-xs text-slate-500">
                Synthesizes recorded inventory levels, request frequencies, and stale reporting patterns.
              </p>
            </div>
          </div>

          <button
            onClick={handleRefreshInsights}
            className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1"
          >
            <span>Re-Analyze Network Data</span>
          </button>
        </div>

        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    insight.severity === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {insight.severity} Priority
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{insight.title}</h4>
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Type: {insight.type.replace('_', ' ')}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {insight.summary}
              </p>

              {/* Evidence list */}
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1 text-xs">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                  Empirical Evidence:
                </p>
                {insight.evidence.map((ev, eIdx) => (
                  <div key={eIdx} className="flex items-start gap-2 text-slate-600 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>{ev}</span>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-950 font-medium">
                <strong className="font-semibold text-teal-900">Coordinated Action: </strong>
                {insight.actionRecommendation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature 3: Standardized Supplier RFQ Generator */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
            03
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Clinical Procurement RFQ Summarizer
            </h3>
            <p className="text-xs text-slate-500">
              Generates an unambiguous, structured request message suitable for instant WhatsApp / SMS / Email communication.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Medicine Formulation</label>
            <select
              value={rfqMedId}
              onChange={(e) => setRfqMedId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Requesting Facility</label>
            <select
              value={rfqClinicId}
              onChange={(e) => setRfqClinicId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
            >
              {facilities.filter(f => f.type !== 'pharmacy').map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Pharmacy</label>
            <select
              value={rfqSupplierId}
              onChange={(e) => setRfqSupplierId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
            >
              {facilities.filter(f => f.type === 'pharmacy').map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.area})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={rfqQty}
                onChange={(e) => setRfqQty(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
              />
              <button
                onClick={handleGenerateRfq}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs whitespace-nowrap shadow-xs"
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        {generatedRfq && (
          <div className="space-y-2">
            <textarea
              readOnly
              rows={8}
              value={generatedRfq}
              className="w-full font-mono text-[11px] bg-slate-900 text-teal-300 p-4 rounded-xl border border-slate-700 leading-relaxed"
            />
            <div className="flex justify-end">
              <button
                onClick={handleCopyRfq}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Formatted RFQ'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Settings Modal */}
      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="AI Engine Configuration & Fallback Status"
        subtitle="MedStock AI operates with zero external dependencies out of the box."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Offline Deterministic Engine Active</span>
            </div>
            Your application runs locally with 100% functionality without requiring paid API tokens, internet connectivity, or remote telemetry.
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Inference Engine</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
            >
              <option value="rule_based">Built-in Deterministic Parser & Matching (Default / Recommended)</option>
              <option value="gemini">Google Gemini 1.5 Pro / Flash (Server Endpoint)</option>
              <option value="openai">OpenAI GPT-4o (Server Endpoint)</option>
            </select>
          </div>

          {modelType !== 'rule_based' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Server-Side API Key / Proxy Endpoint
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Keys are never stored in client bundles or public repositories.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
