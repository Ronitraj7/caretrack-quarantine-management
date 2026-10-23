import React from 'react';
import { useFacility } from '../../context/FacilityContext';
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  ShieldAlert,
  Info,
  Calendar,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { patients, metrics, facilityDate, setSelectedPatientId } = useFacility();

  const activeCohort = patients.filter((p) => p.status === 'active');
  const resolvedCohort = patients.filter(
    (p) => p.finalOutcome === 'recovered' || p.finalOutcome === 'deceased'
  );
  const recoveredPatients = patients.filter((p) => p.finalOutcome === 'recovered');
  const deceasedPatients = patients.filter((p) => p.finalOutcome === 'deceased');

  // Age group mortality breakdown
  const ageBuckets = [
    { label: '< 40 years', min: 0, max: 39 },
    { label: '40 - 64 years', min: 40, max: 64 },
    { label: '65+ years', min: 65, max: 120 },
  ].map((bucket) => {
    const bucketResolved = resolvedCohort.filter(
      (p) => p.age >= bucket.min && p.age <= bucket.max
    );
    const bucketDeaths = bucketResolved.filter((p) => p.finalOutcome === 'deceased');
    const bucketRecovered = bucketResolved.filter((p) => p.finalOutcome === 'recovered');
    const rate =
      bucketResolved.length > 0
        ? Math.round((bucketDeaths.length / bucketResolved.length) * 1000) / 10
        : 0;

    return {
      label: bucket.label,
      total: bucketResolved.length,
      deaths: bucketDeaths.length,
      recovered: bucketRecovered.length,
      mortalityRate: rate,
    };
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Epidemiological Outcomes &amp; Facility Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cohort outcome surveillance calculated strictly on verified final outcomes as of {facilityDate}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
            Total Cohort: <strong>{patients.length}</strong> ({activeCohort.length} active, {resolvedCohort.length} resolved)
          </span>
        </div>
      </div>

      {/* Prominent High Mortality Warning Banner (>15%) */}
      {metrics.isHighMortalityAlert ? (
        <div className="p-5 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 shadow-sm space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-200 text-rose-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <span className="font-bold text-sm uppercase tracking-wide text-rose-950">
                EPIDEMIOLOGICAL ALERT: Observed Mortality Rate Exceeds 15% Threshold ({metrics.mortalityRate}%)
              </span>
              <p className="text-xs text-rose-900 mt-0.5">
                The current observed mortality rate of <strong>{metrics.mortalityRate}%</strong> ({metrics.deceasedCount} deaths / {metrics.totalResolvedPatients} resolved cases) exceeds the critical facility alert benchmark of 15.0%.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-rose-800 bg-rose-100/70 p-2.5 rounded-lg border border-rose-200">
            Sample Size: {metrics.totalResolvedPatients} resolved cases (Denominator) · Deaths: {metrics.deceasedCount} (Numerator) · Active cohort currently under isolation: {activeCohort.length} patients
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong>Mortality Rate Within Threshold:</strong> Observed mortality is {metrics.mortalityRate}% ({metrics.deceasedCount} deaths / {metrics.totalResolvedPatients} resolved cases), below the 15.0% alert cutoff.
          </div>
        </div>
      )}

      {/* Analytical KPI Cards with Numerator, Denominator, and Sample Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Mortality Rate */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Mortality Rate
            </span>
            <TrendingDown className={`w-4 h-4 ${metrics.isHighMortalityAlert ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-3xl font-bold font-mono ${metrics.isHighMortalityAlert ? 'text-rose-600' : 'text-slate-900'}`}>
            {metrics.mortalityRate}%
          </div>
          <div className="mt-2 text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
            <div><strong>Numerator:</strong> {metrics.deceasedCount} deaths</div>
            <div><strong>Denominator:</strong> {metrics.totalResolvedPatients} resolved</div>
            <div><strong>Sample Size:</strong> N = {metrics.totalResolvedPatients}</div>
          </div>
        </div>

        {/* Metric 2: Recovery Rate */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Recovery Rate
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-600">
            {metrics.recoveryRate}%
          </div>
          <div className="mt-2 text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
            <div><strong>Numerator:</strong> {metrics.recoveredCount} recovered</div>
            <div><strong>Denominator:</strong> {metrics.totalResolvedPatients} resolved</div>
            <div><strong>Sample Size:</strong> N = {metrics.totalResolvedPatients}</div>
          </div>
        </div>

        {/* Metric 3: Total Resolved Patients */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Resolved Cases
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900">
            {metrics.totalResolvedPatients}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Excludes {activeCohort.length} active patients still in isolation to prevent distortion.
          </div>
        </div>

        {/* Metric 4: Active Cohort */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Quarantine Cohort
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900">
            {activeCohort.length}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {metrics.occupiedBeds} of {metrics.maxCapacity} beds ({Math.round((metrics.occupiedBeds / metrics.maxCapacity) * 100)}% capacity)
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Age Group Stratification */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Outcomes by Age Demographic Stratification
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Resolved Cohort</span>
          </div>

          <div className="divide-y divide-slate-100">
            {ageBuckets.map((bucket) => (
              <div key={bucket.label} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{bucket.label}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {bucket.deaths} deaths, {bucket.recovered} recovered (N = {bucket.total})
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-mono font-bold text-sm ${bucket.mortalityRate > 15 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {bucket.mortalityRate}% mortality
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {bucket.total === 0 ? 'No resolved cases' : `${bucket.deaths}/${bucket.total}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Epidemiological Calculation Methodology */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Mathematical Methodology &amp; Denominator Definition
            </h3>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px]">
              <strong className="font-sans text-slate-900 block mb-1">Mortality Rate Formula:</strong>
              Mortality Rate = (Total Confirmed Deaths / (Recovered + Deaths)) × 100%
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px]">
              <strong className="font-sans text-slate-900 block mb-1">Recovery Rate Formula:</strong>
              Recovery Rate = (Total Confirmed Recovered / (Recovered + Deaths)) × 100%
            </div>

            <p className="text-[11px] text-slate-500">
              <strong>Assessment Invariant:</strong> Patients currently active with unknown outcomes are strictly excluded from the denominator. Including active patients in the denominator would falsely deflate the observed case fatality rate during ongoing viral transmission.
            </p>
          </div>
        </div>
      </div>

      {/* Resolved Patient Registry Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Resolved Cohort Case Records (N = {resolvedCohort.length})
          </h3>
          <span className="text-xs text-slate-500">
            Verified outcomes (Recovered &amp; Deceased)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Age &amp; Gender</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Outcome Date</th>
                <th className="py-2.5 px-3">Recorded By</th>
                <th className="py-2.5 px-3">Clinical Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resolvedCohort.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {p.name} <span className="font-mono text-slate-500 font-normal">({p.id})</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {p.age}y · {p.gender}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] uppercase ${
                        p.finalOutcome === 'recovered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.finalOutcome}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {p.outcomeDate || p.dischargeDate || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {p.outcomeRecordedBy || 'Authorized Staff'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                    {p.outcomeNotes || 'Quarantine resolved.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
