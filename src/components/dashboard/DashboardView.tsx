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
  ShieldAlert,
  BellRing,
  FileCheck,
} from 'lucide-react';
import {
  evaluateDischargeEligibility,
  getDischargeStage,
  isDailyTemperatureComplete,
  isDailyDoctorVisitComplete,
  getLatestTemperature,
  formatTemp,
  MAX_FACILITY_CAPACITY,
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
    currentUser,
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

  const febrileToday = activePatients.filter((p) => {
    const latest = getLatestTemperature(p, facilityDate);
    return latest && latest.celsius >= feverThreshold;
  });

  // Discharge stage breakdowns
  const awaitingDoctorClearance = activePatients.filter((p) => {
    const stageInfo = getDischargeStage(p, facilityDate, feverThreshold);
    return stageInfo.stage === 'awaiting_doctor_clearance';
  });

  const awaitingAdminDischarge = activePatients.filter((p) => {
    const stageInfo = getDischargeStage(p, facilityDate, feverThreshold);
    return stageInfo.stage === 'awaiting_admin_discharge';
  });

  // Bed capacity alert
  const capacityPercent = Math.round((metrics.occupiedBeds / metrics.maxCapacity) * 100);
  const isNearCapacity = metrics.occupiedBeds >= 67; // >= 90% (67+ of 74)
  const isAtFullCapacity = metrics.occupiedBeds >= MAX_FACILITY_CAPACITY;

  // Ward occupancies
  const wardACount = activePatients.filter((p) => p.ward === 'Ward A').length;
  const wardBCount = activePatients.filter((p) => p.ward === 'Ward B').length;
  const wardCCount = activePatients.filter((p) => p.ward === 'Ward C').length;

  // Total alert items count for "Needs Attention" badge
  const totalAlertsCount =
    (metrics.isHighMortalityAlert ? 1 : 0) +
    (isNearCapacity ? 1 : 0) +
    febrileToday.length +
    pendingTemps.length +
    pendingVisits.length +
    awaitingDoctorClearance.length +
    awaitingAdminDischarge.length;

  return (
    <div className="space-y-6">
      {/* High Mortality Warning Banner (>15%) */}
      {metrics.isHighMortalityAlert && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-200 text-rose-800 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-rose-950">
                  CRITICAL SURVEILLANCE ALERT: High Observed Facility Mortality ({metrics.mortalityRate}%)
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-semibold">
                  Threshold: &gt;15.0%
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                Observed mortality is {metrics.deceasedCount} deaths out of {metrics.totalResolvedPatients} resolved cases ({metrics.mortalityRate}%). Active quarantine cohort: {activePatients.length} patients.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('analytics')}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <span>Review Outcomes Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Welcome / Shift Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Facility Operational Dashboard
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
            <span>Shift Date: <strong className="text-slate-800 font-mono">{facilityDate}</strong></span>
            <span>·</span>
            <span>Capacity: <strong className="text-slate-800 font-mono">{metrics.occupiedBeds} of {metrics.maxCapacity}</strong> ({capacityPercent}% occupied)</span>
            <span>·</span>
            <span>Fever Cutoff: <strong className="text-rose-600 font-mono">≥{feverThreshold.toFixed(1)}°C</strong></span>
          </div>
        </div>

        {/* Quick role indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Active Persona:</span>
          <span className="font-semibold text-slate-900 capitalize px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
            {currentUser.name} ({activeRole})
          </span>
        </div>
      </div>

      {/* 6 Clickable Metrics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Admitted Patients */}
        <button
          onClick={() => handleCardClick('patients', { status: 'active' })}
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-blue-500"
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
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Bed Occupancy
            </span>
            <div className={`p-2 rounded-lg transition-colors ${
              isNearCapacity ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white'
            }`}>
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
                className={`h-full rounded-full transition-all duration-300 ${
                  isAtFullCapacity ? 'bg-rose-600' : isNearCapacity ? 'bg-amber-500' : 'bg-blue-600'
                }`}
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
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Temp Checks
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
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-blue-500"
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
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Discharge Eligible (3 Days)
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
              {awaitingDoctorClearance.length} awaiting MD clearance · {awaitingAdminDischarge.length} cleared awaiting Admin
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
            <span>Review clearance &amp; discharge</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 6: Facility Mortality Rate */}
        <button
          onClick={() => handleCardClick('analytics')}
          className="text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-rose-400 hover:shadow-md transition-all group flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-rose-500"
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

      {/* SECTION 1: ACTIONABLE "NEEDS ATTENTION" QUEUE */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
              <BellRing className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Needs Attention
                </h2>
                <span className="px-2 py-0.5 rounded-full font-mono text-xs font-bold bg-amber-100 text-amber-800">
                  {totalAlertsCount} actionable item{totalAlertsCount === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Actionable clinical, operational, and safety alerts derived dynamically from current patient records
              </p>
            </div>
          </div>
        </div>

        {totalAlertsCount === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            All shift checks, medical rounds, and capacity thresholds are currently clear.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 space-y-2">
            {/* Alert: High Mortality */}
            {metrics.isHighMortalityAlert && (
              <div className="pt-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-rose-50/70 border border-rose-200 rounded-lg">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-rose-900">
                        Facility Mortality Rate Warning
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">
                        {metrics.mortalityRate}% &gt; 15%
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 mt-0.5">
                      Observed mortality exceeds the 15% benchmark ({metrics.deceasedCount} deaths in {metrics.totalResolvedPatients} resolved cases). Review protocol.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-rose-900 bg-rose-200/80 hover:bg-rose-200 rounded-lg transition-colors shrink-0"
                >
                  View Analytics
                </button>
              </div>
            )}

            {/* Alert: Bed Capacity */}
            {isNearCapacity && (
              <div className="pt-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2.5">
                  <BedDouble className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-amber-900">
                        {isAtFullCapacity ? 'Facility Full Capacity' : 'High Bed Occupancy Warning'}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                        {metrics.occupiedBeds} / {metrics.maxCapacity} ({capacityPercent}%)
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {isAtFullCapacity
                        ? 'All 74 quarantine beds are occupied. Further patient admissions are blocked.'
                        : `Facility is approaching the 74-bed capacity limit. Only ${MAX_FACILITY_CAPACITY - metrics.occupiedBeds} beds remain available.`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCardClick('patients', { status: 'active' })}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-lg transition-colors shrink-0"
                >
                  Manage Beds
                </button>
              </div>
            )}

            {/* Alert: Fevers Requiring Clinical Review */}
            {febrileToday.map((patient) => {
              const latest = getLatestTemperature(patient, facilityDate);
              return (
                <div
                  key={`fev-alert-${patient.id}`}
                  className="pt-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white hover:bg-slate-50/80 rounded-lg border border-slate-200 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-rose-100 text-rose-700 rounded-md shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">
                          Active Fever Spiked: {patient.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          ({patient.id}) · Bed #{patient.bedNumber} ({patient.ward})
                        </span>
                        <span className="font-mono font-bold text-xs text-rose-600 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200">
                          {formatTemp(latest?.celsius)} at {latest?.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Patient has an active temperature &ge; {feverThreshold.toFixed(1)}°C today. Afebrile streak reset. Clinical consultation recommended.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setSelectedPatientId(patient.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Patient Chart
                    </button>
                    <button
                      onClick={() => setActiveTab('doctor-visits')}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    >
                      Consult Patient
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Alert: Discharge Review - Awaiting Doctor Medical Clearance */}
            {awaitingDoctorClearance.map((patient) => {
              const elig = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);
              return (
                <div
                  key={`doc-clear-alert-${patient.id}`}
                  className="pt-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white hover:bg-slate-50/80 rounded-lg border border-slate-200 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md shrink-0 mt-0.5">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">
                          Discharge Review: {patient.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          ({patient.id}) · Bed #{patient.bedNumber} ({patient.ward})
                        </span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          Awaiting Doctor Clearance
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Met 3 consecutive fever-free days ({elig.qualifyingDays.map((q) => q.date).join(', ')}). Attending physician must examine and sign medical clearance.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('discharge')}
                    className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shrink-0"
                  >
                    Doctor Review
                  </button>
                </div>
              );
            })}

            {/* Alert: Discharge Review - Awaiting Administrator Discharge Authorization */}
            {awaitingAdminDischarge.map((patient) => (
              <div
                key={`adm-disch-alert-${patient.id}`}
                className="pt-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">
                        Discharge Ready for Sign-Off: {patient.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        ({patient.id}) · Bed #{patient.bedNumber} ({patient.ward})
                      </span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Doctor Cleared
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Medically cleared by {patient.doctorClearance?.doctorName}. Awaiting Administrator formal discharge authorization to release Bed #{patient.bedNumber}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('discharge')}
                  className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shrink-0"
                >
                  Authorize Discharge
                </button>
              </div>
            ))}

            {/* Alert: Missing Daily Temperature Checks */}
            {pendingTemps.slice(0, 4).map((patient) => (
              <div
                key={`ptemp-alert-${patient.id}`}
                className="pt-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white hover:bg-slate-50/80 rounded-lg border border-slate-200 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-md shrink-0 mt-0.5">
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">
                        Missing Temperature: {patient.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        ({patient.id}) · Bed #{patient.bedNumber} ({patient.ward})
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                        Check Overdue
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No temperature reading recorded for shift date {facilityDate}. Missing checks interrupt the afebrile streak calculation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('temperature')}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shrink-0"
                >
                  Record Temp
                </button>
              </div>
            ))}

            {/* Alert: Pending Doctor Consultations */}
            {pendingVisits.slice(0, 3).map((patient) => (
              <div
                key={`pvisit-alert-${patient.id}`}
                className="pt-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white hover:bg-slate-50/80 rounded-lg border border-slate-200 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md shrink-0 mt-0.5">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">
                        Pending Doctor Visit: {patient.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        ({patient.id}) · Bed #{patient.bedNumber} ({patient.ward})
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                        Round Pending
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Daily medical consultation not yet documented for shift date {facilityDate}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('doctor-visits')}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shrink-0"
                >
                  Start Round
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Two-Column Operational Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Shift Workflow Summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Shift Compliance Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Operational completion status for shift date {facilityDate}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {activePatients.length} Active Quarantine Cases
              </span>
            </div>

            <div className="space-y-4">
              {/* Temperature check completion rate */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-700">Temperature Check Completion</span>
                  <span className="font-mono text-slate-900">
                    {activePatients.length - pendingTemps.length} / {activePatients.length} (
                    {Math.round(((activePatients.length - pendingTemps.length) / (activePatients.length || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${((activePatients.length - pendingTemps.length) / (activePatients.length || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Doctor rounds completion rate */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-700">Doctor Rounds Completion</span>
                  <span className="font-mono text-slate-900">
                    {activePatients.length - pendingVisits.length} / {activePatients.length} (
                    {Math.round(((activePatients.length - pendingVisits.length) / (activePatients.length || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${((activePatients.length - pendingVisits.length) / (activePatients.length || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Discharge Stage Pipeline */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 text-[11px] block">In Quarantine</span>
                  <strong className="text-sm font-mono text-slate-800">
                    {activePatients.length - metrics.eligibleForDischargeCount}
                  </strong>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-blue-700 text-[11px] block">Awaiting MD Clearance</span>
                  <strong className="text-sm font-mono text-blue-900">
                    {awaitingDoctorClearance.length}
                  </strong>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-emerald-700 text-[11px] block">Awaiting Admin Sign-off</span>
                  <strong className="text-sm font-mono text-emerald-900">
                    {awaitingAdminDischarge.length}
                  </strong>
                </div>
              </div>
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

          {/* Assessment Invariant Rules */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Assessment Invariant Rules</span>
            </div>
            <ul className="space-y-1.5 text-[11px] list-disc pl-4 text-slate-600">
              <li>Max capacity strictly enforced at 74 beds.</li>
              <li>Fever threshold prototype assumption: ≥{feverThreshold.toFixed(1)}°C.</li>
              <li>Discharge requires 3 full consecutive afebrile days; missing days reset count.</li>
              <li>Separate States: Clinical Eligibility → Doctor Clearance → Admin Discharge.</li>
              <li>Discharge immediately releases assigned bed.</li>
              <li>Mortality rate calculated strictly over resolved outcomes.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
