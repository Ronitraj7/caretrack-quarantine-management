import React, { useState, useMemo } from 'react';
import { useFacility } from '../../context/FacilityContext';
import {
  Stethoscope,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  ShieldAlert,
  FileText,
  User,
  Thermometer,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  getLatestTemperature,
  formatTemp,
  isDailyTemperatureComplete,
  isDailyDoctorVisitComplete,
  evaluateDischargeEligibility,
} from '../../utils/calculations';

export const DoctorVisitsView: React.FC = () => {
  const {
    patients,
    activeRole,
    currentUser,
    facilityDate,
    feverThreshold,
    recordDoctorVisit,
    grantDoctorClearance,
    setSelectedPatientId,
    checkPermission,
  } = useFacility();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'pending' | 'completed' | 'all'>('pending');

  // Consultation modal state
  const [activeConsultationPatientId, setActiveConsultationPatientId] = useState<string | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [treatmentUpdates, setTreatmentUpdates] = useState('');
  const [respiratoryStatus, setRespiratoryStatus] = useState<
    'normal' | 'mild_distress' | 'moderate_distress' | 'severe'
  >('normal');
  const [recommendDischargeReview, setRecommendDischargeReview] = useState(false);
  const [grantClearanceInVisit, setGrantClearanceInVisit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePatients = useMemo(
    () => patients.filter((p) => p.status === 'active'),
    [patients]
  );

  const pendingVisits = useMemo(
    () => activePatients.filter((p) => !isDailyDoctorVisitComplete(p, facilityDate)),
    [activePatients, facilityDate]
  );

  const completedVisits = useMemo(
    () => activePatients.filter((p) => isDailyDoctorVisitComplete(p, facilityDate)),
    [activePatients, facilityDate]
  );

  const filteredPatients = useMemo(() => {
    const list =
      filterMode === 'pending'
        ? pendingVisits
        : filterMode === 'completed'
        ? completedVisits
        : activePatients;

    if (!search.trim()) return list;

    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        String(p.bedNumber).includes(q)
    );
  }, [filterMode, pendingVisits, completedVisits, activePatients, search]);

  // Open consultation modal
  const openConsultModal = (patientId: string) => {
    const perm = checkPermission('doctor_visit');
    if (!perm.allowed) {
      alert(perm.reason);
      return;
    }

    const patient = activePatients.find((p) => p.id === patientId);
    if (!patient) return;

    // Check accidental duplicate completion
    const alreadyVisited = patient.doctorVisits.find((v) => v.date === facilityDate);
    if (alreadyVisited) {
      alert(
        `Consultation already completed for today (${alreadyVisited.date} at ${alreadyVisited.time}) by ${alreadyVisited.doctorName}. Duplicate completion is restricted.`
      );
      return;
    }

    const elig = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);

    setClinicalNotes('');
    setTreatmentUpdates('Continue isolation protocol, monitor oxygen saturation Q4H.');
    setRespiratoryStatus('normal');
    setRecommendDischargeReview(elig.isEligible);
    setGrantClearanceInVisit(elig.isEligible && !patient.doctorClearance?.isCleared);
    setFormError(null);
    setActiveConsultationPatientId(patientId);
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultationPatientId || isSubmitting) return;

    if (!clinicalNotes.trim()) {
      setFormError('Clinical notes are required to complete the medical consultation.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await recordDoctorVisit(activeConsultationPatientId, {
        clinicalNotes,
        treatmentUpdates,
        respiratoryStatus,
        recommendDischargeReview,
      });

      if (res.success) {
        if (grantClearanceInVisit) {
          await grantDoctorClearance(activeConsultationPatientId, clinicalNotes);
        }
        setActiveConsultationPatientId(null);
      } else {
        setFormError(res.message);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An error occurred completing consultation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePatient = activePatients.find((p) => p.id === activeConsultationPatientId);
  const activePatientLatestTemp = activePatient
    ? getLatestTemperature(activePatient, facilityDate)
    : null;
  const tempIsPending = !activePatientLatestTemp;

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Daily Doctor Rounds &amp; Consultation Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift consultations for <strong className="font-mono text-slate-700">{facilityDate}</strong> · Attending: <strong className="text-slate-800">{currentUser.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
            Pending Rounds: <strong className="font-mono">{pendingVisits.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            Completed Rounds: <strong className="font-mono">{completedVisits.length}</strong>
          </div>
        </div>
      </div>

      {/* Role Permission Banner */}
      {activeRole !== 'doctor' && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are signed in as <strong>{activeRole}</strong>. Only <strong>Doctor</strong> role can record clinical consultations and treatment orders. (Use the Role Switcher in the top bar to switch to Doctor).
            </span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queue by patient name, ID, or bed..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Rounds ({pendingVisits.length})
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'completed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed Today ({completedVisits.length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Active ({activePatients.length})
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            No patients found in this queue state.
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const latestTempToday = getLatestTemperature(patient, facilityDate);
            const tempPending = !latestTempToday;
            const visitToday = patient.doctorVisits.find((v) => v.date === facilityDate);
            const isCompletedToday = !!visitToday;
            const eligibility = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);

            return (
              <div
                key={patient.id}
                className={`p-4 bg-white rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompletedToday
                    ? 'border-slate-200 bg-slate-50/50'
                    : tempPending
                    ? 'border-amber-300 ring-1 ring-amber-100'
                    : 'border-slate-300 shadow-xs'
                }`}
              >
                {/* Patient Summary */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {patient.name}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      ({patient.id})
                    </span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Bed #{patient.bedNumber} · {patient.ward}
                    </span>

                    {patient.doctorClearance?.isCleared ? (
                      <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        Doctor Clearance Granted (Stage 2 Complete)
                      </span>
                    ) : eligibility.isEligible ? (
                      <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Stage 1 Met (3 Afebrile Days) · Awaiting Doctor Clearance
                      </span>
                    ) : null}
                  </div>

                  {/* Temperature Status Indicator & Warning */}
                  <div className="flex items-center gap-3 text-xs pt-0.5">
                    {latestTempToday ? (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Thermometer className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-600 font-sans">Today's Temp:</span>
                        <strong
                          className={
                            latestTempToday.isFever ? 'text-rose-600' : 'text-slate-900'
                          }
                        >
                          {latestTempToday.celsius.toFixed(1)}°C
                        </strong>
                        <span className="text-slate-400 text-[11px]">
                          ({latestTempToday.time} by {latestTempToday.recordedBy.split(' ')[0]})
                        </span>
                      </div>
                    ) : (
                      /* Warning banner when temperature has not been recorded */
                      <div className="flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Warning: Temperature check pending for today</span>
                      </div>
                    )}

                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500 text-[11px]">
                      Afebrile Streak: <strong className="font-mono text-slate-700">{eligibility.consecutiveDays} days</strong>
                    </span>
                  </div>

                  {/* Visit info if completed */}
                  {visitToday && (
                    <div className="text-xs text-slate-600 pt-1 border-t border-slate-100 mt-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Consultation completed at <strong className="font-mono">{visitToday.time}</strong> by {visitToday.doctorName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        &ldquo;{visitToday.clinicalNotes}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Medical Chart
                  </button>

                  {isCompletedToday ? (
                    <button
                      disabled
                      className="px-3.5 py-2 text-xs font-semibold text-slate-400 bg-slate-100 rounded-lg border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
                      title="Consultation already recorded for today"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Round Complete</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openConsultModal(patient.id)}
                      disabled={activeRole !== 'doctor'}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                        activeRole !== 'doctor'
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                      title={activeRole !== 'doctor' ? 'Doctor role required' : ''}
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Record Consultation</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Consultation Modal */}
      {activeConsultationPatientId && activePatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 my-8">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Daily Medical Consultation
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: <strong className="text-slate-800">{activePatient.name}</strong> ({activePatient.id}) · Bed #{activePatient.bedNumber}
                </p>
              </div>
              <button
                onClick={() => setActiveConsultationPatientId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Warning if temperature check was pending */}
            {tempIsPending && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Warning: Temperature Check Pending!</strong>
                  No morning temperature reading has been recorded yet for today ({facilityDate}). You may proceed with the consultation, but this warning will be flagged in the clinical visit log.
                </div>
              </div>
            )}

            {/* If temperature was recorded, display clearly */}
            {!tempIsPending && activePatientLatestTemp && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">Today's Recorded Temperature:</span>
                  <strong className={`font-mono text-base ${activePatientLatestTemp.isFever ? 'text-rose-600' : 'text-slate-900'}`}>
                    {activePatientLatestTemp.celsius.toFixed(1)}°C
                  </strong>
                  <span className="text-slate-500 ml-2 font-mono text-[11px]">
                    ({activePatientLatestTemp.time} by {activePatientLatestTemp.recordedBy})
                  </span>
                </div>
                {activePatientLatestTemp.isFever && (
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold font-mono text-[11px]">
                    FEBRILE
                  </span>
                )}
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveConsultation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Respiratory Status / Distress Level:
                </label>
                <select
                  value={respiratoryStatus}
                  onChange={(e) => setRespiratoryStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="normal">Normal - Eupneic, no accessory muscle use</option>
                  <option value="mild_distress">Mild Distress - Exertional dyspnea</option>
                  <option value="moderate_distress">Moderate Distress - Tachypneic at rest</option>
                  <option value="severe">Severe - Acute respiratory distress, high risk</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Examination &amp; Notes:
                </label>
                <textarea
                  required
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. Patient alert, lungs clear bilaterally, coughing decreased, hydration adequate."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Treatment Plan &amp; Medication Updates:
                </label>
                <textarea
                  required
                  value={treatmentUpdates}
                  onChange={(e) => setTreatmentUpdates(e.target.value)}
                  placeholder="e.g. Paracetamol 1g PO PRN, continue antiviral course, taper O2."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              {/* Discharge Governance & Medical Clearance Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Discharge Governance
                  </span>
                  {activePatient && (
                    <span className="text-xs font-mono font-medium text-slate-500">
                      Afebrile Streak: {evaluateDischargeEligibility(activePatient, facilityDate, feverThreshold).consecutiveDays} / 3 days
                    </span>
                  )}
                </div>

                {activePatient && evaluateDischargeEligibility(activePatient, facilityDate, feverThreshold).isEligible ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-emerald-900">
                          Clinical Criteria Met (Stage 1 Complete)
                        </p>
                        <p className="text-emerald-700 text-[11px] font-mono mt-0.5">
                          Verified fever-free dates: {evaluateDischargeEligibility(activePatient, facilityDate, feverThreshold).qualifyingDays.map((d) => d.date).join(', ')}
                        </p>
                      </div>
                    </div>

                    {activePatient.doctorClearance?.isCleared ? (
                      <div className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                        Doctor Medical Clearance was previously granted on{' '}
                        <strong>{activePatient.doctorClearance.clearedDate}</strong> by{' '}
                        <strong>{activePatient.doctorClearance.doctorName}</strong>. Patient is waiting in Stage 3 for Administrator discharge execution.
                      </div>
                    ) : (
                      <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={grantClearanceInVisit}
                          onChange={(e) => setGrantClearanceInVisit(e.target.checked)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-xs font-medium text-slate-800">
                          <strong className="text-blue-900 font-semibold">Grant Attending Doctor Medical Clearance (Stage 2)</strong>
                          <span className="block text-[11px] text-slate-600 mt-0.5">
                            Authorizes patient for Stage 3 Administrative Discharge and bed release.
                          </span>
                        </span>
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                    Patient has not yet met the 3-day consecutive afebrile requirement (requires 3 full calendar days with valid readings &lt; {feverThreshold.toFixed(1)}°C). Doctor clearance cannot be issued until Stage 1 criteria are satisfied.
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                  <input
                    type="checkbox"
                    id="recDischarge"
                    checked={recommendDischargeReview}
                    onChange={(e) => setRecommendDischargeReview(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <label htmlFor="recDischarge" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Flag for routine discharge review in shift handover notes
                  </label>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                Attending Physician: <strong className="text-slate-800 font-sans">{currentUser.name}</strong> ({currentUser.licenseNumber})
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveConsultationPatientId(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving to API...' : 'Complete Consultation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
