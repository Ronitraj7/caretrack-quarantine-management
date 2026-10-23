import React, { useState, useMemo } from 'react';
import { useFacility } from '../../context/FacilityContext';
import {
  X,
  User,
  BedDouble,
  Thermometer,
  Stethoscope,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
  AlertCircle,
  Shield,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  History,
  Activity,
} from 'lucide-react';
import {
  formatTemp,
  evaluateDischargeEligibility,
  getDischargeStage,
  getLatestTemperature,
} from '../../utils/calculations';

interface PatientDetailModalProps {
  patientId: string;
  onClose: () => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patientId,
  onClose,
}) => {
  const {
    patients,
    facilityDate,
    feverThreshold,
    grantDoctorClearance,
    recordDischarge,
    recordFinalOutcome,
    activeRole,
    currentUser,
    checkPermission,
  } = useFacility();

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'vitals' | 'consultations'>('overview');

  // Clearance modal
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [clearanceJustification, setClearanceJustification] = useState('');

  // Discharge modal
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState('');

  // Outcome modal
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'recovered' | 'deceased'>('recovered');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [confirmOutcomeOverwrite, setConfirmOutcomeOverwrite] = useState(false);

  // Permission error banner
  const [permError, setPermError] = useState<string | null>(null);

  const patient = patients.find((p) => p.id === patientId);

  if (!patient) return null;

  const eligibility = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);
  const stageInfo = getDischargeStage(patient, facilityDate, feverThreshold);
  const latestTemp = getLatestTemperature(patient);

  // Build Chronological Timeline Events
  interface TimelineEvent {
    id: string;
    date: string;
    time: string;
    type: 'admission' | 'temperature' | 'doctor_visit' | 'clearance' | 'discharge' | 'outcome';
    title: string;
    description: string;
    author?: string;
    isFever?: boolean;
    isRepeat?: boolean;
    timestamp: number;
  }

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];

    // 1. Admission
    events.push({
      id: `adm-${patient.id}`,
      date: patient.admissionDate,
      time: patient.admissionTime,
      type: 'admission',
      title: 'Quarantine Admission & Bed Assignment',
      description: `Patient admitted to ${patient.ward}, assigned Bed #${patient.bedNumber}.`,
      author: 'Admissions Office',
      timestamp: new Date(`${patient.admissionDate}T${patient.admissionTime}:00`).getTime() || 0,
    });

    // 2. Temperature History
    for (const r of patient.temperatureHistory) {
      events.push({
        id: r.id,
        date: r.date,
        time: r.time,
        type: 'temperature',
        title: r.isFever
          ? `Febrile Reading: ${r.celsius.toFixed(1)}°C (≥${feverThreshold.toFixed(1)}°C)`
          : `Afebrile Reading: ${r.celsius.toFixed(1)}°C (<${feverThreshold.toFixed(1)}°C)`,
        description: r.notes || (r.isRepeatMeasurement ? 'Repeat temperature verification' : 'Routine vital check'),
        author: `${r.recordedBy} (${r.recordedByRole})`,
        isFever: r.isFever,
        isRepeat: r.isRepeatMeasurement,
        timestamp: r.timestamp || new Date(`${r.date}T${r.time}:00`).getTime(),
      });
    }

    // 3. Doctor Visits
    for (const v of patient.doctorVisits) {
      events.push({
        id: v.id,
        date: v.date,
        time: v.time,
        type: 'doctor_visit',
        title: `Medical Consultation Round (${v.respiratoryStatus.replace('_', ' ')})`,
        description: `${v.clinicalNotes} | Treatment: ${v.treatmentUpdates}`,
        author: v.doctorName,
        timestamp: v.timestamp || new Date(`${v.date}T${v.time}:00`).getTime(),
      });
    }

    // 4. Doctor Clearance
    if (patient.doctorClearance?.isCleared) {
      events.push({
        id: `clear-${patient.id}`,
        date: patient.doctorClearance.clearedDate || patient.admissionDate,
        time: patient.doctorClearance.clearedTime || '10:00',
        type: 'clearance',
        title: 'Doctor Medical Clearance Granted',
        description: patient.doctorClearance.clinicalJustification || '3 consecutive afebrile days verified and medical clearance signed.',
        author: patient.doctorClearance.doctorName,
        timestamp: new Date(`${patient.doctorClearance.clearedDate}T${patient.doctorClearance.clearedTime || '10:00'}:00`).getTime(),
      });
    }

    // 5. Discharge
    if (patient.status === 'discharged' && patient.dischargeDate) {
      events.push({
        id: `disch-${patient.id}`,
        date: patient.dischargeDate,
        time: '11:30',
        type: 'discharge',
        title: 'Formal Facility Discharge Authorized',
        description: `Quarantine completed. Bed #${patient.bedNumber} released. Authorized by ${patient.dischargeAuthorizedBy}.`,
        author: patient.dischargeAuthorizedBy,
        timestamp: new Date(`${patient.dischargeDate}T11:30:00`).getTime(),
      });
    }

    // 6. Outcome History
    if (patient.outcomeHistory && patient.outcomeHistory.length > 0) {
      for (const rec of patient.outcomeHistory) {
        events.push({
          id: `out-${rec.timestamp}`,
          date: rec.date,
          time: '12:00',
          type: 'outcome',
          title: `Final Clinical Outcome: ${rec.outcome.toUpperCase()}`,
          description: rec.notes || 'Official facility epidemiological outcome record.',
          author: rec.recordedBy,
          timestamp: rec.timestamp,
        });
      }
    } else if (patient.finalOutcome !== 'active' && patient.outcomeDate) {
      events.push({
        id: `out-initial-${patient.id}`,
        date: patient.outcomeDate,
        time: '12:00',
        type: 'outcome',
        title: `Final Clinical Outcome: ${patient.finalOutcome.toUpperCase()}`,
        description: patient.outcomeNotes || 'Official facility epidemiological outcome record.',
        author: patient.outcomeRecordedBy,
        timestamp: new Date(`${patient.outcomeDate}T12:00:00`).getTime(),
      });
    }

    // Sort chronologically (oldest first)
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }, [patient, feverThreshold]);

  // Handle granting clearance
  const handleOpenClearance = () => {
    const perm = checkPermission('grant_clearance');
    if (!perm.allowed) {
      setPermError(perm.reason || 'Doctor role required to grant medical clearance.');
      return;
    }
    setClearanceJustification(
      `Afebrile for ${eligibility.consecutiveDays} days (${eligibility.qualifyingDays.map(q => q.date).join(', ')}). Respiratory exam normal, symptom resolution confirmed.`
    );
    setPermError(null);
    setShowClearanceModal(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setPermError(null);

    try {
      const res = await grantDoctorClearance(patient.id, clearanceJustification);
      if (res.success) {
        setShowClearanceModal(false);
      } else {
        setPermError(res.message);
      }
    } catch (err: unknown) {
      setPermError(err instanceof Error ? err.message : 'Error granting clearance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle discharge
  const handleOpenDischarge = () => {
    const perm = checkPermission('discharge');
    if (!perm.allowed) {
      setPermError(perm.reason || 'Discharge authorization requires Administrator role.');
      return;
    }
    if (!patient.doctorClearance?.isCleared) {
      setPermError('Discharge rejected: Prior medical clearance from an attending Doctor is required before an Administrator can authorize discharge.');
      return;
    }
    setDischargeNotes('Quarantine clearance criteria met: 3 consecutive afebrile days verified and Doctor medical clearance recorded.');
    setPermError(null);
    setShowDischargeConfirm(true);
  };

  const handleConfirmDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setPermError(null);

    try {
      const res = await recordDischarge(patient.id, dischargeNotes);
      if (res.success) {
        setShowDischargeConfirm(false);
      } else {
        setPermError(res.message);
      }
    } catch (err: unknown) {
      setPermError(err instanceof Error ? err.message : 'Error authorizing discharge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle outcome recording
  const handleOpenOutcome = () => {
    const perm = checkPermission('record_outcome');
    if (!perm.allowed) {
      setPermError(perm.reason || 'Recording final outcomes requires Administrator role.');
      return;
    }
    setSelectedOutcome(patient.finalOutcome === 'deceased' ? 'deceased' : 'recovered');
    setOutcomeNotes(patient.outcomeNotes || '');
    setConfirmOutcomeOverwrite(false);
    setPermError(null);
    setShowOutcomeModal(true);
  };

  const handleConfirmOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // If patient already has a resolved outcome and user is amending it, require explicit checkbox confirmation
    if (patient.finalOutcome !== 'active' && patient.finalOutcome !== selectedOutcome && !confirmOutcomeOverwrite) {
      setPermError(`Please check the confirmation box to amend the existing outcome from '${patient.finalOutcome}' to '${selectedOutcome}'.`);
      return;
    }

    setIsSubmitting(true);
    setPermError(null);

    try {
      const res = await recordFinalOutcome(patient.id, selectedOutcome, outcomeNotes);
      if (res.success) {
        setShowOutcomeModal(false);
      } else {
        setPermError(res.message);
      }
    } catch (err: unknown) {
      setPermError(err instanceof Error ? err.message : 'Error certifying outcome.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg text-white">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-slate-100">{patient.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {patient.id}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-semibold font-mono ${
                    patient.status === 'active'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {patient.status === 'active' ? 'ACTIVE IN QUARANTINE' : 'DISCHARGED'}
                </span>
                {patient.finalOutcome !== 'active' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold font-mono uppercase ${
                      patient.finalOutcome === 'recovered'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    Outcome: {patient.finalOutcome}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                <span>Age: <strong className="text-slate-200">{patient.age}y</strong></span>
                <span>·</span>
                <span className="capitalize">Gender: <strong className="text-slate-200">{patient.gender}</strong></span>
                <span>·</span>
                <span>Admitted: <strong className="text-slate-200 font-mono">{patient.admissionDate} ({patient.admissionTime})</strong></span>
                <span>·</span>
                <span>Bed: <strong className="text-slate-200 font-mono">#{patient.bedNumber} ({patient.ward})</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview &amp; Clearance Gates
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Event Timeline ({timelineEvents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('vitals')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'vitals'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vitals Log ({patient.temperatureHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('consultations')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'consultations'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Consultations ({patient.doctorVisits.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Logged in as: {currentUser.name} ({activeRole})
          </span>
        </div>

        {/* Permission Error Banner */}
        {permError && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{permError}</span>
            </div>
            <button
              onClick={() => setPermError(null)}
              className="text-amber-700 hover:text-amber-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto text-xs space-y-6">
          {/* TAB 1: OVERVIEW & CLEARANCE GATES */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 3-Stage Discharge Pipeline Stepper */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Discharge Governance Pipeline
                  </h3>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    Status: {stageInfo.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Gate 1: 3-Day Rule */}
                  <div className={`p-3 rounded-lg border ${
                    stageInfo.isClinicallyEligible ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>1. Clinical 3-Day Rule</span>
                      {stageInfo.isClinicallyEligible ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="font-mono text-[10px] text-amber-700">{eligibility.consecutiveDays}/3</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {stageInfo.isClinicallyEligible
                        ? `Passed: 3 consecutive fever-free days (${eligibility.qualifyingDays.map(q => q.date).join(', ')})`
                        : eligibility.summary}
                    </p>
                  </div>

                  {/* Gate 2: Doctor Clearance */}
                  <div className={`p-3 rounded-lg border ${
                    stageInfo.isDoctorCleared ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>2. Doctor Clearance</span>
                      {stageInfo.isDoctorCleared ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="font-mono text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {stageInfo.isDoctorCleared
                        ? `Cleared by ${patient.doctorClearance?.doctorName} (${patient.doctorClearance?.clearedDate})`
                        : stageInfo.isClinicallyEligible
                        ? 'Ready for Attending Physician Medical Clearance'
                        : 'Awaiting clinical 3-day eligibility'}
                    </p>
                  </div>

                  {/* Gate 3: Admin Discharge */}
                  <div className={`p-3 rounded-lg border ${
                    stageInfo.isAdminDischarged ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>3. Admin Discharge</span>
                      {stageInfo.isAdminDischarged ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="font-mono text-[10px] text-slate-400">Bed Occupied</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {stageInfo.isAdminDischarged
                        ? `Completed on ${patient.dischargeDate}. Bed #${patient.bedNumber} released.`
                        : stageInfo.isDoctorCleared
                        ? 'Ready for Administrator formal discharge authorization'
                        : 'Awaiting Doctor clearance sign-off'}
                    </p>
                  </div>
                </div>

                {/* Actions depending on stage and role */}
                {patient.status === 'active' && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2 flex-wrap">
                    {/* If clinically eligible and not doctor cleared -> Allow Doctor to clear */}
                    {stageInfo.isClinicallyEligible && !stageInfo.isDoctorCleared && (
                      <button
                        onClick={handleOpenClearance}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Grant Doctor Clearance</span>
                      </button>
                    )}

                    {/* If clinically eligible and doctor cleared -> Allow Admin to discharge */}
                    {stageInfo.isClinicallyEligible && stageInfo.isDoctorCleared && (
                      <button
                        onClick={handleOpenDischarge}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Authorize Admin Discharge &amp; Release Bed</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Final Outcome Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs mb-1">
                    Final Clinical Outcome Record
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] uppercase ${
                      patient.finalOutcome === 'recovered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : patient.finalOutcome === 'deceased'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {patient.finalOutcome}
                    </span>
                    {patient.outcomeDate && (
                      <span className="text-slate-500 font-mono text-[11px]">
                        Recorded: {patient.outcomeDate} by {patient.outcomeRecordedBy}
                      </span>
                    )}
                  </div>
                  {patient.outcomeNotes && (
                    <p className="text-slate-600 text-xs mt-1 italic">
                      &ldquo;{patient.outcomeNotes}&rdquo;
                    </p>
                  )}
                </div>

                <button
                  onClick={handleOpenOutcome}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white hover:bg-slate-50 text-slate-700 border-slate-300 transition-colors"
                >
                  {patient.finalOutcome === 'active' ? 'Record Final Outcome' : 'Amend Outcome'}
                </button>
              </div>

              {/* Quick vitals summary */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Today's Vital Status ({facilityDate})
                  </h4>
                  <button
                    onClick={() => setActiveTab('vitals')}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    View All {patient.temperatureHistory.length} Readings →
                  </button>
                </div>
                {latestTemp ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Latest Reading</span>
                      <span className={`text-xl font-bold font-mono ${latestTemp.isFever ? 'text-rose-600' : 'text-slate-900'}`}>
                        {latestTemp.celsius.toFixed(1)}°C {latestTemp.isFever ? '(FEVER)' : '(Afebrile)'}
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 font-mono">
                      <div>Recorded at {latestTemp.time}</div>
                      <div>By {latestTemp.recordedBy}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 text-xs">
                    No temperature reading recorded for today's shift yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHRONOLOGICAL PATIENT TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Chronological Clinical Event Feed
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real recorded admissions, temperature measurements, consultations, clearance decisions, and discharge events.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {timelineEvents.length} events logged
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timelineEvents.map((evt) => {
                  const Icon =
                    evt.type === 'admission'
                      ? BedDouble
                      : evt.type === 'temperature'
                      ? Thermometer
                      : evt.type === 'doctor_visit'
                      ? Stethoscope
                      : evt.type === 'clearance'
                      ? CheckCircle2
                      : evt.type === 'discharge'
                      ? LogOut
                      : TrendingUp;

                  const colorClass =
                    evt.type === 'admission'
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : evt.type === 'temperature'
                      ? evt.isFever
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : evt.type === 'doctor_visit'
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                      : evt.type === 'clearance'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                      : evt.type === 'discharge'
                      ? 'bg-slate-800 text-white border-slate-900'
                      : 'bg-purple-100 text-purple-800 border-purple-300';

                  return (
                    <div key={evt.id} className="relative">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[27px] top-1 w-5 h-5 rounded-full border flex items-center justify-center ${colorClass}`}
                      >
                        <Icon className="w-3 h-3" />
                      </div>

                      {/* Event content box */}
                      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {evt.title}
                            </span>
                            {evt.isRepeat && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                                Repeat Check
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {evt.date} at {evt.time}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          {evt.description}
                        </p>

                        {evt.author && (
                          <div className="text-[10px] text-slate-500 pt-1 font-mono">
                            Recorded by: <strong className="text-slate-700 font-sans">{evt.author}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: VITALS LOG */}
          {activeTab === 'vitals' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Complete Temperature Measurement History
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {patient.temperatureHistory.length} measurements
                </span>
              </div>

              {patient.temperatureHistory.length === 0 ? (
                <div className="p-6 bg-slate-50 text-center text-slate-500 rounded-lg border border-slate-200">
                  No temperature records exist for this patient yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Date &amp; Time</th>
                        <th className="py-2.5 px-3">Temperature</th>
                        <th className="py-2.5 px-3">Classification</th>
                        <th className="py-2.5 px-3">Staff</th>
                        <th className="py-2.5 px-3">Clinical Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...patient.temperatureHistory]
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((reading) => (
                          <tr key={reading.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                              {reading.date} {reading.time}
                              {reading.isRepeatMeasurement && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-sans font-medium">
                                  Repeat Check
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold whitespace-nowrap">
                              <span className={reading.isFever ? 'text-rose-600' : 'text-slate-800'}>
                                {reading.celsius.toFixed(1)}°C
                              </span>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {reading.isFever ? (
                                <span className="font-semibold text-rose-600">
                                  Fever (≥{feverThreshold.toFixed(1)}°C)
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium">
                                  Afebrile (&lt;{feverThreshold.toFixed(1)}°C)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                              {reading.recordedBy}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {reading.notes || '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONSULTATIONS LOG */}
          {activeTab === 'consultations' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Doctor Rounds &amp; Medical Consultations
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {patient.doctorVisits.length} visits
                </span>
              </div>

              {patient.doctorVisits.length === 0 ? (
                <div className="p-6 bg-slate-50 text-center text-slate-500 rounded-lg border border-slate-200">
                  No doctor consultations recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[...patient.doctorVisits]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((visit) => (
                      <div
                        key={visit.id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{visit.doctorName}</span>
                            <span className="font-mono text-slate-500 text-[11px]">
                              {visit.date} at {visit.time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="capitalize text-slate-600 font-sans">
                              Resp: <strong className="font-mono">{visit.respiratoryStatus.replace('_', ' ')}</strong>
                            </span>
                            {visit.temperatureWasPending && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-sans font-medium">
                                Temp Pending Warning
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-slate-700">
                          <strong className="text-slate-900">Clinical Notes: </strong>
                          {visit.clinicalNotes}
                        </div>

                        <div className="text-slate-600">
                          <strong className="text-slate-900">Treatment Plan: </strong>
                          {visit.treatmentUpdates}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 text-xs">
            Bed #{patient.bedNumber} ({patient.ward})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Grant Doctor Clearance Modal */}
      {showClearanceModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Grant Doctor Medical Clearance
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Patient: <strong>{patient.name}</strong> ({patient.id}) · Bed #{patient.bedNumber}
            </p>

            <form onSubmit={handleConfirmClearance} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attending Doctor:
                </label>
                <input
                  type="text"
                  disabled
                  value={`${currentUser.name} (${currentUser.title})`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Examination &amp; Justification:
                </label>
                <textarea
                  required
                  value={clearanceJustification}
                  onChange={(e) => setClearanceJustification(e.target.value)}
                  placeholder="Document clinical exam findings..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowClearanceModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? 'Signing...' : 'Sign Medical Clearance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Discharge Confirmation Modal */}
      {showDischargeConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Confirm Facility Discharge
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Discharging <strong>{patient.name}</strong> will remove them from active occupancy and immediately release <strong>Bed #{patient.bedNumber}</strong>.
            </p>

            <form onSubmit={handleConfirmDischarge} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Discharge Clearance Notes:
                </label>
                <textarea
                  required
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  placeholder="Administrative clearance documentation..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDischargeConfirm(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg flex items-center gap-2"
                >
                  {isSubmitting ? 'Finalizing Discharge...' : 'Confirm & Release Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Final Outcome Modal with Non-Silent Overwrite Safeguard */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Record Final Clinical Outcome
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Recording verified epidemiological outcome for <strong>{patient.name}</strong>. Updates facility mortality and recovery statistics.
            </p>

            {/* Overwrite warning if an outcome was already recorded */}
            {patient.finalOutcome !== 'active' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Outcome Amendment Warning
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Current recorded outcome: <strong className="uppercase font-mono">{patient.finalOutcome}</strong> (recorded on {patient.outcomeDate} by {patient.outcomeRecordedBy}). This amendment will be tracked in the patient history audit log.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="confirmAmend"
                    checked={confirmOutcomeOverwrite}
                    onChange={(e) => setConfirmOutcomeOverwrite(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <label htmlFor="confirmAmend" className="text-amber-900 font-semibold text-[11px] cursor-pointer">
                    I confirm this outcome amendment is intentional
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmOutcome} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Outcome Status:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('recovered')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      selectedOutcome === 'recovered'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Recovered (Cured)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('deceased')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      selectedOutcome === 'deceased'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Deceased (Fatal)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Outcome Documentation Notes:
                </label>
                <textarea
                  required
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Clinical documentation notes..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving to API...' : 'Save Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
