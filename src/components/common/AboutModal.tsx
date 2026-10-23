import React from 'react';
import { useFacility } from '../../context/FacilityContext';
import { X, ShieldAlert, FileText, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export const AboutModal: React.FC = () => {
  const { aboutModalOpen, setAboutModalOpen, feverThreshold } = useFacility();

  if (!aboutModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30 text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                CareTrack Prototype & Clinical Assumptions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Technical Product Manager Assessment Prototype Documentation
              </p>
            </div>
          </div>
          <button
            onClick={() => setAboutModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto text-xs text-slate-700 leading-relaxed">
          {/* Disclaimer banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Prototype & Data Privacy Disclaimer</strong>
              This software is a functional prototype built for product evaluation. All patient names, IDs, and records are fictional sample data. Prototype data is stored locally in the browser and is NOT secure or suitable for real Protected Health Information (PHI) or production clinical care.
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              1. Discharge Criteria & Clinical Assumptions
            </h4>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
              <li>
                <strong>Configurable Fever Threshold ({feverThreshold.toFixed(1)}°C):</strong> 38.0°C is adopted as a demonstration prototype assumption, NOT an established clinical rule. The threshold can be adjusted in the header toolbar to test varying outbreak protocols.
              </li>
              <li>
                <strong>3 Consecutive Fever-Free Days Rule:</strong> To qualify for discharge review, a patient must complete three full consecutive calendar days where at least one valid temperature check was recorded and all readings on that day were &lt; {feverThreshold.toFixed(1)}°C.
              </li>
              <li>
                <strong>Strict Missing Data Policy:</strong> Missing temperature measurements are NEVER counted as fever-free days. If a daily check is missed, the consecutive fever-free streak is interrupted.
              </li>
              <li>
                <strong>Streak Reset on Fever:</strong> Any recorded measurement &ge; {feverThreshold.toFixed(1)}°C immediately resets the fever-free counter to zero.
              </li>
              <li>
                <strong>No Automated Clinical Decision-Making:</strong> The system identifies eligibility criteria, but NEVER automatically diagnoses, prescribes treatment, or discharges patients without explicit authorized human clinical confirmation.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              2. Facility Capacity & Bed Management
            </h4>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
              <li>
                <strong>Strict 74-Bed Limit:</strong> The facility accommodates a hard maximum of 74 active patients (Ward A: Beds 1-25, Ward B: Beds 26-50, Ward C: Beds 51-74). Admissions are blocked once all 74 beds are occupied.
              </li>
              <li>
                <strong>Instant Bed Release on Discharge:</strong> When an authorized user records a patient discharge, the patient is removed from active occupancy and their bed is immediately freed for reassignment.
              </li>
              <li>
                <strong>Discharge Finality:</strong> Discharges cannot be reversed through ordinary edit screens to prevent administrative record tampering.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              3. Analytics & Mortality Calculation
            </h4>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
              <li>
                <strong>Resolved Outcomes Cohort:</strong> Recovery and mortality percentages are calculated strictly using patients with recorded final outcomes (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">Recovered + Deceased</code>). Currently active patients with unresolved outcomes are never treated as recovered.
              </li>
              <li>
                <strong>Explicit Denominators:</strong> Every metric displays the numerator, denominator, and total sample size adjacent to the percentage figure.
              </li>
              <li>
                <strong>Epidemiological Alert:</strong> A prominent alert banner is displayed whenever the observed facility mortality rate exceeds 15.0%.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              4. Role-Based Access Control (RBAC)
            </h4>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
              <li>
                <strong>Nurse:</strong> Temperature recordings, repeat readings, temperature history verification, daily check completeness view.
              </li>
              <li>
                <strong>Doctor:</strong> Consultation queue, pre-consultation vitals review with pending warnings, clinical notes &amp; treatment updates, discharge recommendations.
              </li>
              <li>
                <strong>Administrator:</strong> Patient admissions &amp; bed assignment, occupancy governance, formal discharge authorization, final clinical outcome records (recovery/death).
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={() => setAboutModalOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
