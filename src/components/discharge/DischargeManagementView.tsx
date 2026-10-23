import React, { useState, useMemo } from 'react';
import { useFacility } from '../../context/FacilityContext';
import {
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  BedDouble,
  User,
  HelpCircle,
  FileText,
  AlertCircle,
  Stethoscope,
  ArrowRight,
  Shield,
} from 'lucide-react';
import {
  evaluateDischargeEligibility,
  getDischargeStage,
  formatTemp,
  getLatestTemperature,
} from '../../utils/calculations';

export const DischargeManagementView: React.FC = () => {
  const {
    patients,
    activeRole,
    currentUser,
    facilityDate,
    feverThreshold,
    grantDoctorClearance,
    recordDischarge,
    setSelectedPatientId,
    checkPermission,
  } = useFacility();

  // Doctor Clearance modal state
  const [activeClearancePatientId, setActiveClearancePatientId] = useState<string | null>(null);
  const [clearanceJustification, setClearanceJustification] = useState('');
  const [clearanceError, setClearanceError] = useState<string | null>(null);

  // Admin Discharge modal state
  const [activeDischargePatientId, setActiveDischargePatientId] = useState<string | null>(null);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [dischargeError, setDischargeError] = useState<string | null>(null);

  // Role restriction info dialog
  const [restrictionNotice, setRestrictionNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activePatients = useMemo(
    () => patients.filter((p) => p.status === 'active'),
    [patients]
  );

  const dischargedPatients = useMemo(
    () => patients.filter((p) => p.status === 'discharged'),
    [patients]
  );

  // Categorize active cohort by distinct discharge stage
  const {
    awaitingDoctorClearanceList,
    awaitingAdminDischargeList,
    inQuarantineList,
  } = useMemo(() => {
    const awaitingDoc: typeof activePatients = [];
    const awaitingAdm: typeof activePatients = [];
    const inQuarantine: typeof activePatients = [];

    for (const p of activePatients) {
      const stageInfo = getDischargeStage(p, facilityDate, feverThreshold);
      if (stageInfo.stage === 'awaiting_admin_discharge') {
        awaitingAdm.push(p);
      } else if (stageInfo.stage === 'awaiting_doctor_clearance') {
        awaitingDoc.push(p);
      } else {
        inQuarantine.push(p);
      }
    }

    return {
      awaitingDoctorClearanceList: awaitingDoc,
      awaitingAdminDischargeList: awaitingAdm,
      inQuarantineList: inQuarantine,
    };
  }, [activePatients, facilityDate, feverThreshold]);

  // Handle open clearance modal
  const handleOpenClearance = (patientId: string) => {
    const perm = checkPermission('grant_clearance');
    if (!perm.allowed) {
      setRestrictionNotice(perm.reason || 'Medical clearance requires Doctor role.');
      return;
    }
    const patient = activePatients.find((p) => p.id === patientId);
    const elig = evaluateDischargeEligibility(patient!, facilityDate, feverThreshold);
    setClearanceJustification(
      `Patient afebrile for ${elig.consecutiveDays} consecutive days (${elig.qualifyingDays.map(q => q.date).join(', ')}). Respiratory exam normal, symptom resolution confirmed.`
    );
    setClearanceError(null);
    setActiveClearancePatientId(patientId);
  };

  const handleSaveClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClearancePatientId || isSubmitting) return;

    setIsSubmitting(true);
    setClearanceError(null);

    try {
      const res = await grantDoctorClearance(activeClearancePatientId, clearanceJustification);
      if (res.success) {
        setActiveClearancePatientId(null);
      } else {
        setClearanceError(res.message);
      }
    } catch (err: unknown) {
      setClearanceError(err instanceof Error ? err.message : 'Error granting clearance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle open admin discharge modal
  const handleOpenDischarge = (patientId: string) => {
    const perm = checkPermission('discharge');
    if (!perm.allowed) {
      setRestrictionNotice(perm.reason || 'Discharge authorization requires Administrator role.');
      return;
    }

    const patient = activePatients.find((p) => p.id === patientId);
    if (!patient?.doctorClearance?.isCleared) {
      setRestrictionNotice(
        `Discharge authorization blocked: ${patient?.name} has not received clinical clearance from an attending Doctor yet. A Doctor must first review and clear the patient.`
      );
      return;
    }

    setDischargeNotes('Quarantine clearance criteria met: 3 consecutive afebrile days verified and Doctor medical clearance recorded.');
    setDischargeError(null);
    setActiveDischargePatientId(patientId);
  };

  const handleConfirmDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDischargePatientId || isSubmitting) return;

    setIsSubmitting(true);
    setDischargeError(null);

    try {
      const res = await recordDischarge(activeDischargePatientId, dischargeNotes);
      if (res.success) {
        setActiveDischargePatientId(null);
      } else {
        setDischargeError(res.message);
      }
    } catch (err: unknown) {
      setDischargeError(err instanceof Error ? err.message : 'Error completing discharge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearanceTargetPatient = activePatients.find((p) => p.id === activeClearancePatientId);
  const dischargeTargetPatient = activePatients.find((p) => p.id === activeDischargePatientId);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Discharge Governance &amp; Clearance Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Three distinct clearance gates: <strong className="text-slate-800">1. Clinical 3-Day Rule</strong> → <strong className="text-slate-800">2. Doctor Medical Clearance</strong> → <strong className="text-slate-800">3. Admin Authorized Discharge</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
            Awaiting MD Clearance: <strong className="font-mono">{awaitingDoctorClearanceList.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
            Ready for Admin Sign-off: <strong className="font-mono">{awaitingAdminDischargeList.length}</strong>
          </div>
        </div>
      </div>

      {/* Role State Banner */}
      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-slate-700" />
          <span className="text-slate-700">
            Active User: <strong className="text-slate-900">{currentUser.name}</strong> ({activeRole}).
            {activeRole === 'nurse' && ' Bedside nurse role: Can monitor eligibility; cannot clear or discharge.'}
            {activeRole === 'doctor' && ' Attending physician: Can evaluate clinically eligible patients and grant Medical Clearance.'}
            {activeRole === 'admin' && ' Facility administrator: Can authorize final discharge and release quarantine beds.'}
          </span>
        </div>
        <span className="text-slate-400 font-mono text-[11px] shrink-0">
          Simulated Role Switcher
        </span>
      </div>

      {/* The 3-Stage Workflow Architecture Diagram */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>Multi-Stage Clearance &amp; Bed Release Gates</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Step 1 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-slate-900 font-semibold">Stage 1: Clinical Eligibility</strong>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                Automated Rule
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Patient must have 3 complete consecutive calendar days where all readings are &lt; {feverThreshold.toFixed(1)}°C. Missing measurements never count. Fever breaks the streak.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-blue-950 font-semibold">Stage 2: Doctor Clearance</strong>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 font-bold">
                Doctor Role
              </span>
            </div>
            <p className="text-[11px] text-blue-900 leading-relaxed">
              Attending physician conducts medical examination, reviews the temperature history, and signs off clinical clearance with written justification.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-emerald-950 font-semibold">Stage 3: Admin Discharge</strong>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                Admin Role
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Administrator signs off formal facility discharge, logs documentation, and releases the assigned bed immediately for incoming admissions.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Awaiting Administrator Formal Discharge (Stage 3 Gate) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ready for Admin Authorized Discharge ({awaitingAdminDischargeList.length})</span>
          </h2>
          <span className="text-xs text-emerald-700 font-medium">
            Clinically Eligible + Doctor Cleared
          </span>
        </div>

        {awaitingAdminDischargeList.length === 0 ? (
          <div className="p-5 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            No patients currently awaiting administrator discharge sign-off.
          </div>
        ) : (
          <div className="space-y-3">
            {awaitingAdminDischargeList.map((patient) => {
              const elig = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);

              return (
                <div
                  key={patient.id}
                  className="p-5 bg-white border-2 border-emerald-400 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {patient.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        ({patient.id})
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        Bed #{patient.bedNumber} · {patient.ward}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        Stage 3: Ready for Admin Sign-Off
                      </span>
                    </div>

                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          <strong>Doctor Clearance Signed:</strong> {patient.doctorClearance?.doctorName} on {patient.doctorClearance?.clearedDate} at {patient.doctorClearance?.clearedTime}
                        </span>
                      </div>
                      <p className="text-[11px] italic text-emerald-900">
                        &ldquo;{patient.doctorClearance?.clinicalJustification}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Qualifying Afebrile Dates:</span>
                      {elig.qualifyingDays.map((q) => (
                        <span
                          key={q.date}
                          className="px-2 py-0.5 bg-slate-100 rounded font-mono text-[11px] text-slate-800 border border-slate-200"
                        >
                          {q.date} (max {q.maxTemp.toFixed(1)}°C)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    <button
                      onClick={() => setSelectedPatientId(patient.id)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Medical Chart
                    </button>
                    <button
                      onClick={() => handleOpenDischarge(patient.id)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Authorize Discharge &amp; Release Bed</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Awaiting Doctor Medical Clearance (Stage 2 Gate) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span>Awaiting Doctor Medical Clearance ({awaitingDoctorClearanceList.length})</span>
          </h2>
          <span className="text-xs text-blue-700 font-medium">
            3 Afebrile Days Verified · Needs Attending Physician Sign-Off
          </span>
        </div>

        {awaitingDoctorClearanceList.length === 0 ? (
          <div className="p-5 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            No patients currently awaiting doctor clearance.
          </div>
        ) : (
          <div className="space-y-3">
            {awaitingDoctorClearanceList.map((patient) => {
              const elig = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);

              return (
                <div
                  key={patient.id}
                  className="p-5 bg-white border border-blue-300 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {patient.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        ({patient.id})
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        Bed #{patient.bedNumber} · {patient.ward}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                        Stage 2: 3-Day Rule Passed
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Qualifying Afebrile Dates:</span>
                      {elig.qualifyingDays.map((q) => (
                        <span
                          key={q.date}
                          className="px-2 py-0.5 bg-slate-100 rounded font-mono text-[11px] text-slate-800 border border-slate-200"
                        >
                          {q.date} (max {q.maxTemp.toFixed(1)}°C)
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Completed 3 full consecutive fever-free days with documented readings. Requires attending physician to examine and sign clinical clearance before Administrator can authorize discharge.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    <button
                      onClick={() => setSelectedPatientId(patient.id)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Patient Chart
                    </button>
                    <button
                      onClick={() => handleOpenClearance(patient.id)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Grant Medical Clearance</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Active Quarantine Cohort / Streak Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Active Cohort Streak Progression ({inQuarantineList.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Awaiting 3 full consecutive afebrile days
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-3">Bed</th>
                  <th className="py-2.5 px-3">Streak Progress</th>
                  <th className="py-2.5 px-3">Days Remaining</th>
                  <th className="py-2.5 px-3">Calculation Details / Last Break</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inQuarantineList.map((patient) => {
                  const elig = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{patient.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{patient.id}</div>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        Bed #{patient.bedNumber} ({patient.ward})
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${(elig.consecutiveDays / 3) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800">
                            {elig.consecutiveDays}/3
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {3 - elig.consecutiveDays} day(s)
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {elig.streakBreakReason ? (
                          <span className="text-amber-800 text-[11px] font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            {elig.streakBreakReason}
                          </span>
                        ) : elig.consecutiveDays > 0 ? (
                          <span className="text-emerald-700 text-[11px] font-mono">
                            Afebrile on {elig.qualifyingDays.map(q => q.date).join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Awaiting initial afebrile sequence
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedPatientId(patient.id)}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          View Chart
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: Completed Discharges & Released Beds */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <span>Completed Discharges &amp; Freed Beds ({dischargedPatients.length})</span>
        </h2>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-3">Discharge Date</th>
                  <th className="py-2.5 px-3">Freed Bed</th>
                  <th className="py-2.5 px-3">Authorized By</th>
                  <th className="py-2.5 px-3">Final Outcome</th>
                  <th className="py-2.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dischargedPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {patient.name}
                      <span className="ml-1.5 font-mono text-[11px] text-slate-500 font-normal">
                        ({patient.id})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {patient.dischargeDate || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 font-medium">
                      Bed #{patient.bedNumber} (Released &amp; Available)
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {patient.dischargeAuthorizedBy || 'Administrator'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] uppercase ${
                        patient.finalOutcome === 'recovered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {patient.finalOutcome}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedPatientId(patient.id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Archived Chart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Grant Doctor Medical Clearance */}
      {activeClearancePatientId && clearanceTargetPatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Grant Doctor Medical Clearance
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Patient: <strong>{clearanceTargetPatient.name}</strong> ({clearanceTargetPatient.id}) · Bed #{clearanceTargetPatient.bedNumber}
            </p>

            {clearanceError && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{clearanceError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClearance} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attending Physician:
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
                  Clinical Examination &amp; Clearance Justification:
                </label>
                <textarea
                  required
                  value={clearanceJustification}
                  onChange={(e) => setClearanceJustification(e.target.value)}
                  placeholder="Clinical notes verifying afebrile status, clear chest auscultation, and clearance justification..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveClearancePatientId(null)}
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

      {/* Modal: Authorize Admin Discharge */}
      {activeDischargePatientId && dischargeTargetPatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Authorize Facility Discharge
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Discharging <strong>{dischargeTargetPatient.name}</strong> ({dischargeTargetPatient.id}) will finalize their quarantine record and immediately release <strong>Bed #{dischargeTargetPatient.bedNumber}</strong>.
            </p>

            {dischargeError && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{dischargeError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDischarge} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Authorizing Administrator:
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
                  Doctor Medical Clearance Verification:
                </label>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 font-mono text-[11px]">
                  Cleared by {dischargeTargetPatient.doctorClearance?.doctorName} on {dischargeTargetPatient.doctorClearance?.clearedDate}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Administrative Clearance Documentation:
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
                  onClick={() => setActiveDischargePatientId(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? 'Finalizing Discharge...' : 'Authorize Discharge & Release Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Restriction Explanatory Dialog */}
      {restrictionNotice && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Role Permission Boundary
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {restrictionNotice}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Current Role: <strong className="capitalize text-slate-800">{activeRole}</strong>
              </span>
              <button
                onClick={() => setRestrictionNotice(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
