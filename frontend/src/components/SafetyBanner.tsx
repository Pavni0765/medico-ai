import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle } from 'lucide-react';

export const SafetyBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 text-xs sm:text-sm px-4 py-2.5 flex items-center justify-between transition-all">
      <div className="flex items-center gap-2.5 flex-1 max-w-7xl mx-auto">
        <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
        <div className="leading-snug">
          <span className="font-semibold text-amber-950">DEMO & CLINICAL SAFETY NOTICE:</span> MedStock AI coordinates logistical availability of essential medicines. 
          <span className="hidden sm:inline"> This system does <strong className="font-semibold">not</strong> offer medical advice or automate therapeutic substitutions. Reported stock is unconfirmed until the supplier verifies physical batch numbers.</span>
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
            Fictional Data Only
          </span>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-700 hover:text-amber-950 p-1 rounded hover:bg-amber-100 ml-2 flex-shrink-0"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
