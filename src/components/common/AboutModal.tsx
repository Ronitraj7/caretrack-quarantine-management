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
              <strong className="font-semibold block mb-0.5">Prototype &amp; Data Privacy Disclaimer</strong>
              This software is a functional prototype built for product evaluation. All patient names, IDs, and records are fictional sample data stored locally in browser storage. It does not provide real enterprise authentication or encryption and is NOT secure or suitable for real Protected Health Information (PHI) or production clinical care.
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              1. 3-Stage Discharge Safety Governance &amp; Clinical Rules
            </h4>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
              <li>
                <strong>Stage 1 (Clinical Eligibility):</strong> Requires three full consecutive calendar days with documented temperature readings below the configurable threshold ({feverThreshold.toFixed(1)}°C). Missing calendar days never count as afebrile; a fever spike resets the counter to zero. Exact qualifying dates are displayed for clinical transparency.
              </li>
              <li>
                <strong>Stage 2 (Doctor Medical Clearance):</strong> Attending Physicians review patient history, vitals, and respiratory status to sign off medical clearance. If an afebrile patient subsequently records a fever, any granted clearance is automatically revoked.
              </li>
              <li>
                <strong>Stage 3 (Administrative Discharge &amp; Bed Release):</strong> Administrators verify administrative readiness and execute final discharge, which releases the bed into available inventory immediately.
              </li>
              <li>
                <strong>Configurable Fever Threshold ({feverThreshold.toFixed(1)}°C):</strong> 38.0°C is an adjustable prototype assumption, not a static clinical absolute.
              </li>
              <li>
                <strong>No Automated Discharge:</strong> The system gates eligibility but never discharges patients without explicit human clinician and administrative sign-offs.
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
              4. Role-Based Access Control (RBAC) &amp; Security Disclaimer
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
              <li>
                <strong>Important Limitation:</strong> Frontend validation and the simulated role switcher enforce business rules for assessment evaluation, but do NOT provide production-grade authentication or server-side authorization. JSON Server does not enforce database constraints.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              5. JSON Server REST Backend &amp; Vercel Deployment
            </h4>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
              <li>
                <strong>REST Endpoints:</strong> Connected to lightweight JSON Server on port 3001 serving collections: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">/patients</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">/temperatureReadings</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">/consultations</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">/discharges</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">/outcomes</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">/activityLogs</code>, and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">/facilityConfig</code>.
              </li>
              <li>
                <strong>Local Development:</strong> Run <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">npm run dev:all</code> to launch both the Vite frontend and JSON Server concurrently.
              </li>
              <li>
                <strong>Vercel Deployment:</strong> The frontend is fully compatible with Vercel SPA deployment. To connect a deployed frontend to an API backend, host JSON Server on a persistent cloud service (e.g., Render, Railway, Fly.io) and configure the <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">VITE_API_URL</code> environment variable in your Vercel project settings.
              </li>
              <li>
                <strong>Resilient Fallback:</strong> If <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">VITE_API_URL</code> is unconfigured or the server is offline, CareTrack operates seamlessly on local browser storage fallback, displaying a clear connection indicator in the navigation bar.
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
