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
} from 'lucide-react';
import {
  evaluateDischargeEligibility,
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
    recordDischarge,
    setSelectedPatientId,
    checkPermission,
  } = useFacility();

  const [activeDischargePatientId, setActiveDischargePatientId] = useState<string | null>(null);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const activePatients = useMemo(
    () => patients.filter((p) => p.status === 'active'),
    [patients]
  );

  const dischargedPatients = useMemo(
    () => patients.filter((p) => p.status === 'discharged'),
    [patients]
  );

  // Group active patients by eligibility
  const { eligiblePatients, inQuarantinePatients } = useMemo(() => {
    const eligible: typeof activePatients = [];
    const inQuarantine: typeof activePatients = [];

    for (const p of activePatients) {
      const result = evaluateDischargeEligibility(p, facilityDate, feverThreshold);
      if (result.isEligible) {
        eligible.push(p);
      } else {
        inQuarantine.push(p);
      }
    }

    return { eligiblePatients: eligible, inQuarantinePatients: inQuarantine };
  }, [activePatients, facilityDate, feverThreshold]);

  const handleOpenDischarge = (patientId: string) => {
    const perm = checkPermission('discharge');
    if (!perm.allowed) {
      alert(perm.reason);
      return;
    }
    setDischargeNotes('Quarantine clearance criteria met: 3 consecutive afebrile days verified.');
    setModalError(null);
    setActiveDischargePatientId(patientId);
  };

  const handleConfirmDischarge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDischargePatientId) return;

    const res = recordDischarge(activeDischargePatientId, dischargeNotes);
    if (res.success) {
      setActiveDischargePatientId(null);
    } else {
      setModalError(res.message);
    }
  };

  const dischargingPatient = patients.find((p) => p.id === activeDischargePatientId);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Discharge Governance &amp; Clearance Protocol
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Clearance criterion: <strong className="text-slate-800">3 full consecutive fever-free days</strong> (&lt;{feverThreshold.toFixed(1)}°C) with valid recorded measurements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
            Eligible for Discharge: <strong className="font-mono">{eligiblePatients.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            Active in Isolation: <strong className="font-mono">{inQuarantinePatients.length}</strong>
          </div>
        </div>
      </div>

      {/* Role permission alert if Nurse */}
      {activeRole === 'nurse' && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are signed in as <strong>Nurse</strong>. Nurses cannot authorize patient discharge. Administrator or Doctor authorization is required.
            </span>
          </div>
          <span className="text-amber-800 font-mono text-[11px]">Clearance Restricted</span>
        </div>
      )}

      {/* Clinical Protocol Explanation Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>Clinical Clearance Invariant Rules</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600">
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <strong className="block text-slate-800 mb-1">1. 3 Consecutive Afebrile Days</strong>
            Must have 3 consecutive calendar days where all recorded readings are &lt; {feverThreshold.toFixed(1)}°C.
          </div>
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <strong className="block text-slate-800 mb-1">2. No Credit for Missing Data</strong>
            Missing temperature days CANNOT count as fever-free. Missing records immediately reset the streak.
          </div>
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <strong className="block text-slate-800 mb-1">3. Bed Released Instantly</strong>
            Authorizing discharge removes active status, releases the bed for reassignment, and cannot be undone via ordinary edits.
          </div>
        </div>
      </div>

      {/* Section 1: Eligible for Discharge */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Patients Eligible for Discharge ({eligiblePatients.length})</span>
          </h2>
          <span className="text-xs text-emerald-700 font-medium">
            3 consecutive fever-free days verified
          </span>
        </div>

        {eligiblePatients.length === 0 ? (
          <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            No patients currently meet the 3 consecutive fever-free days threshold.
          </div>
        ) : (
          <div className="space-y-3">
            {eligiblePatients.map((patient) => {
              const elig = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);

              return (
                <div
                  key={patient.id}
                  className="p-5 bg-white border border-emerald-300 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {patient.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        ({patient.id})
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        Bed #{patient.bedNumber} · {patient.ward}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        {elig.consecutiveDays} Consecutive Afebrile Days
                      </span>
                    </div>

                    {/* Exact qualifying dates display */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Qualifying Dates Used:</span>
                      {elig.qualifyingDays.map((q) => (
                        <span
                          key={q.date}
                          className="px-2 py-1 bg-slate-100 rounded font-mono text-[11px] text-slate-800 border border-slate-200"
                        >
                          {q.date} (max {q.maxTemp.toFixed(1)}°C)
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Admitted: <span className="font-mono">{patient.admissionDate}</span> · Doctor rounds: <span className="font-mono">{patient.doctorVisits.length} recorded</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedPatientId(patient.id)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Patient Chart
                    </button>
                    <button
                      onClick={() => handleOpenDischarge(patient.id)}
                      disabled={activeRole === 'nurse'}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                        activeRole === 'nurse'
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      title={activeRole === 'nurse' ? 'Administrator or Doctor required' : ''}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Authorize Discharge</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: In Quarantine / Streak Progressing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Active Cohort Streak Status ({inQuarantinePatients.length})</span>
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
                {inQuarantinePatients.map((patient) => {
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

      {/* Section 3: Completed Discharges */}
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
                      Bed #{patient.bedNumber} (Released)
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {patient.dischargeAuthorizedBy || 'Staff Authorized'}
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
                        Archived File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Discharge Confirmation Modal */}
      {activeDischargePatientId && dischargingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Authorize Patient Discharge
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Discharging <strong>{dischargingPatient.name}</strong> ({dischargingPatient.id}) will remove them from active quarantine and immediately release <strong>Bed #{dischargingPatient.bedNumber}</strong>.
            </p>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDischarge} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Authorizing Staff:
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
                  Discharge Date:
                </label>
                <input
                  type="text"
                  disabled
                  value={facilityDate}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clearance &amp; Discharge Documentation:
                </label>
                <textarea
                  required
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  placeholder="Clinical clearance justification..."
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
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Confirm Discharge &amp; Release Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
