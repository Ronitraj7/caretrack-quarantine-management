import React from 'react';
import { useFacility } from '../../context/FacilityContext';
import {
  Users,
  BedDouble,
  Thermometer,
  Stethoscope,
  LogOut,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  evaluateDischargeEligibility,
  isDailyTemperatureComplete,
  isDailyDoctorVisitComplete,
  getLatestTemperature,
  formatTemp,
} from '../../utils/calculations';

export const DashboardView: React.FC = () => {
  const {
    patients,
    facilityDate,
    feverThreshold,
    metrics,
    setActiveTab,
    setPatientFilter,
    setSelectedPatientId,
    activeRole,
  } = useFacility();

  const activePatients = patients.filter((p) => p.status === 'active');

  // Filter actions on clicking cards
  const handleCardClick = (
    tab: 'patients' | 'temperature' | 'doctor-visits' | 'discharge' | 'analytics',
    filter?: any
  ) => {
    setActiveTab(tab);
    if (filter) {
      setPatientFilter(filter);
    }
  };

  // Patients needing immediate attention today
  const pendingTemps = activePatients.filter(
    (p) => !isDailyTemperatureComplete(p, facilityDate)
  );

  const pendingVisits = activePatients.filter(
    (p) => !isDailyDoctorVisitComplete(p, facilityDate)
  );

  const eligibleDischarges = activePatients.filter(
    (p) => evaluateDischargeEligibility(p, facilityDate, feverThreshold).isEligible
  );

  const febrileToday = activePatients.filter((p) => {
    const latest = getLatestTemperature(p, facilityDate);
    return latest && latest.celsius >= feverThreshold;
  });

  // Ward occupancies
  const wardACount = activePatients.filter((p) => p.ward === 'Ward A').length;
  const wardBCount = activePatients.filter((p) => p.ward === 'Ward B').length;
  const wardCCount = activePatients.filter((p) => p.ward === 'Ward C').length;

  return (
    <div className="space-y-6">
      {/* High Mortality Warning Banner (>15%) */}
      {metrics.isHighMortalityAlert && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-200/60 rounded-lg text-rose-800 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-rose-950">
                  CRITICAL SURVEILLANCE ALERT: High Observed Facility Mortality ({metrics.mortalityRate}%)
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-semibold">
                  Threshold: &gt;15.0%
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                Observed mortality is {metrics.deceasedCount} deaths out of {metrics.totalResolvedPatients} resolved cases ({metrics.mortalityRate}%). Total active quarantine cohort: {activePatients.length} patients.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('analytics')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition-colors"
          >
            <span>Review Outcomes Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Welcome / Shift Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Facility Operational Dashboard
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Shift Date: <strong className="text-slate-700 font-mono">{facilityDate}</strong></span>
            <span>·</span>
            <span>Capacity: <strong className="text-slate-700 font-mono">{metrics.occupiedBeds} of {metrics.maxCapacity}</strong> ({Math.round((metrics.occupiedBeds / metrics.maxCapacity) * 100)}% occupied)</span>
            <span>·</span>
            <span>Fever Cutoff: <strong className="text-rose-600 font-mono">≥{feverThreshold.toFixed(1)}°C</strong></span>
          </div>
        </div>

        {/* Quick role action prompt */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Active Role:</span>
          <span className="font-semibold text-slate-900 capitalize px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
            {activeRole}
          </span>
        </div>
      </div>

      {/* 6 Clickable Metrics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Admitted Patients */}
        <button
          onClick={() => handleCardClick('patients', { status: 'active' })}
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Admitted Patients
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-slate-900">
              {metrics.totalAdmittedActive}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active in quarantine wards · Click to view roster
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 font-medium">
            <span>View all active patients</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 2: Occupied Beds out of 74 */}
        <button
          onClick={() => handleCardClick('patients', { status: 'active' })}
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Bed Occupancy
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-slate-900 flex items-baseline gap-1.5">
              <span>{metrics.occupiedBeds}</span>
              <span className="text-lg font-normal text-slate-400">/ {metrics.maxCapacity}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${(metrics.occupiedBeds / metrics.maxCapacity) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-mono">{metrics.maxCapacity - metrics.occupiedBeds} beds available</span>
            <span className="text-blue-600 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
              Inspect beds <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 3: Pending Temperature Checks */}
        <button
          onClick={() => handleCardClick('temperature')}
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Temperature Checks
            </span>
            <div className={`p-2 rounded-lg transition-colors ${
              metrics.pendingTempChecksToday > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-slate-900 flex items-baseline gap-2">
              <span className={metrics.pendingTempChecksToday > 0 ? 'text-amber-600' : 'text-slate-900'}>
                {metrics.pendingTempChecksToday}
              </span>
              <span className="text-xs font-sans text-slate-500">
                of {activePatients.length} active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics.pendingTempChecksToday === 0
                ? 'All patient checks complete for today'
                : 'Awaiting nurse temperature check today'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-700 font-medium">
            <span>Record temperature checks</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 4: Pending Doctor Visits */}
        <button
          onClick={() => handleCardClick('doctor-visits')}
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Doctor Visits
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-slate-900">
              {metrics.pendingDoctorVisitsToday}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily medical rounds queue · {activePatients.length - metrics.pendingDoctorVisitsToday} completed today
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 font-medium">
            <span>Open consultation queue</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 5: Potentially Eligible for Discharge */}
        <button
          onClick={() => handleCardClick('discharge')}
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Eligible for Discharge
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-emerald-600">
              {metrics.eligibleForDischargeCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Completed 3 full consecutive fever-free days
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
            <span>Review discharge approvals</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 6: Facility Mortality Rate */}
        <button
          onClick={() => handleCardClick('analytics')}
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-rose-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Observed Mortality Rate
            </span>
            <div className={`p-2 rounded-lg transition-colors ${
              metrics.isHighMortalityAlert ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
            }`}>
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold font-mono tracking-tight ${
                metrics.isHighMortalityAlert ? 'text-rose-600' : 'text-slate-900'
              }`}>
                {metrics.mortalityRate}%
              </span>
              {metrics.isHighMortalityAlert && (
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                  High Risk
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {metrics.deceasedCount} deaths / {metrics.totalResolvedPatients} resolved cases
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span>Denominator: Resolved cases only</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Two-Column Operational Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Immediate Clinical Priorities */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Immediate Shift Priority Actions
                </h3>
                <p className="text-xs text-slate-500">
                  Patients requiring daily temperature check, medical round, or discharge review on {facilityDate}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {pendingTemps.length + pendingVisits.length + eligibleDischarges.length} tasks
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Category A: Patients eligible for discharge */}
              {eligibleDischarges.map((patient) => {
                const eligibility = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);
                return (
                  <div
                    key={`elig-${patient.id}`}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">
                            {patient.name} ({patient.id})
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Bed #{patient.bedNumber} · {patient.ward}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                          Completed 3 fever-free days ({eligibility.qualifyingDays.map(q => q.date).join(', ')})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('discharge');
                      }}
                      className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      Authorize Discharge
                    </button>
                  </div>
                );
              })}

              {/* Category B: Febrile Patients Today */}
              {febrileToday.map((patient) => {
                const latest = getLatestTemperature(patient, facilityDate);
                return (
                  <div
                    key={`fev-${patient.id}`}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-rose-100 text-rose-800 rounded-lg shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">
                            {patient.name} ({patient.id})
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Bed #{patient.bedNumber} · {patient.ward}
                          </span>
                        </div>
                        <p className="text-xs text-rose-700 mt-0.5 font-medium font-mono">
                          Active fever today: {formatTemp(latest?.celsius)} at {latest?.time}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPatientId(patient.id);
                      }}
                      className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    >
                      View Patient File
                    </button>
                  </div>
                );
              })}

              {/* Category C: Pending Temp Checks */}
              {pendingTemps.slice(0, 4).map((patient) => (
                <div
                  key={`ptemp-${patient.id}`}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {patient.name} ({patient.id})
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Bed #{patient.bedNumber} · {patient.ward}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Daily temperature check pending for {facilityDate}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('temperature');
                    }}
                    className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                  >
                    Check Temp
                  </button>
                </div>
              ))}

              {pendingTemps.length === 0 && febrileToday.length === 0 && eligibleDischarges.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  All critical morning shift checks are complete for today.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ward Breakdown & Quick Reference */}
        <div className="space-y-4">
          {/* Ward Breakdown Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Ward Occupancy
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Capacity distribution across quarantine wings
            </p>

            <div className="space-y-3">
              {/* Ward A */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-700">Ward A (Beds 1 - 25)</span>
                  <span className="font-mono text-slate-900">{wardACount} / 25</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${(wardACount / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Ward B */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-700">Ward B (Beds 26 - 50)</span>
                  <span className="font-mono text-slate-900">{wardBCount} / 25</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${(wardBCount / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Ward C */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-700">Ward C (Beds 51 - 74)</span>
                  <span className="font-mono text-slate-900">{wardCCount} / 24</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full"
                    style={{ width: `${(wardCCount / 24) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Total Available:</span>
              <strong className="font-mono text-slate-900">
                {metrics.maxCapacity - metrics.occupiedBeds} free beds
              </strong>
            </div>
          </div>

          {/* Clinical Rules Quick Reference */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Assessment Invariant Rules</span>
            </div>
            <ul className="space-y-1.5 text-[11px] list-disc pl-4 text-slate-600">
              <li>Max capacity strictly enforced at 74 beds.</li>
              <li>Fever threshold prototype assumption: ≥{feverThreshold.toFixed(1)}°C.</li>
              <li>Discharge requires 3 full consecutive afebrile days; missing days reset count.</li>
              <li>Discharge immediately releases assigned bed.</li>
              <li>Mortality rate calculated strictly over resolved outcomes.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
