import React, { useState } from 'react';
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
  PlusCircle,
} from 'lucide-react';
import {
  formatTemp,
  evaluateDischargeEligibility,
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
    recordDischarge,
    recordFinalOutcome,
    activeRole,
    currentUser,
  } = useFacility();

  const patient = patients.find((p) => p.id === patientId);

  // Discharge modal state
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState('');

  // Outcome modal state
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'recovered' | 'deceased'>('recovered');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  if (!patient) return null;

  const eligibility = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);
  const latestTemp = getLatestTemperature(patient);

  const handleConfirmDischarge = () => {
    recordDischarge(patient.id, dischargeNotes);
    setShowDischargeConfirm(false);
  };

  const handleConfirmOutcome = () => {
    recordFinalOutcome(patient.id, selectedOutcome, outcomeNotes);
    setShowOutcomeModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg text-white">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-100">{patient.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {patient.id}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    patient.status === 'active'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {patient.status === 'active' ? 'Active in Quarantine' : 'Discharged'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>Age: <strong className="text-slate-200">{patient.age}</strong></span>
                <span>·</span>
                <span className="capitalize">Gender: <strong className="text-slate-200">{patient.gender}</strong></span>
                <span>·</span>
                <span>Admitted: <strong className="text-slate-200 font-mono">{patient.admissionDate}</strong></span>
                <span>·</span>
                <span>Bed: <strong className="text-slate-200 font-mono">#{patient.bedNumber} ({patient.ward})</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-xs">
          {/* Discharge Eligibility Status Banner */}
          <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    Quarantine Discharge Status
                  </span>
                  {patient.status === 'active' ? (
                    eligibility.isEligible ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono text-[11px]">
                        ELIGIBLE FOR DISCHARGE (3+ Afebrile Days)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold font-mono text-[11px]">
                        In Quarantine ({eligibility.consecutiveDays}/3 afebrile days)
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold font-mono text-[11px]">
                      DISCHARGED ON {patient.dischargeDate}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {eligibility.summary}
                </p>

                {eligibility.qualifyingDays.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-slate-700">
                    <span className="font-sans font-semibold text-slate-500">Qualifying Afebrile Dates:</span>
                    {eligibility.qualifyingDays.map((q) => (
                      <span key={q.date} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">
                        {q.date} (max {q.maxTemp.toFixed(1)}°C)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {patient.status === 'active' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowDischargeConfirm(true)}
                    disabled={activeRole === 'nurse'}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                      activeRole === 'nurse'
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : eligibility.isEligible
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                    title={
                      activeRole === 'nurse'
                        ? 'Nurses cannot authorize discharge. Administrator or Doctor role required.'
                        : ''
                    }
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Authorize Discharge</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Final Outcome Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900 text-xs mb-1">
                Final Clinical Outcome
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
              onClick={() => setShowOutcomeModal(true)}
              disabled={activeRole === 'nurse'}
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                activeRole === 'nurse'
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title={
                activeRole === 'nurse'
                  ? 'Only Administrators or Doctors can record final outcomes.'
                  : ''
              }
            >
              Update Final Outcome
            </button>
          </div>

          {/* Temperature History (with repeat measurements preserved) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-rose-500" />
                <span>Temperature Measurement Audit Log</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {patient.temperatureHistory.length} total reading(s)
              </span>
            </div>

            {patient.temperatureHistory.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center">
                No temperature readings recorded for this patient yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Temperature</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                      <th className="py-2.5 px-3">Clinical Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...patient.temperatureHistory]
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((reading) => {
                        return (
                          <tr key={reading.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                              {reading.date} {reading.time}
                              {reading.isRepeatMeasurement && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-sans font-medium">
                                  Repeat Check
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold whitespace-nowrap">
                              <span
                                className={
                                  reading.isFever ? 'text-rose-600' : 'text-slate-800'
                                }
                              >
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
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Doctor Consultations Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <span>Doctor Consultation Rounds</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {patient.doctorVisits.length} consultation(s)
              </span>
            </div>

            {patient.doctorVisits.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center">
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
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 text-xs">
            Assigned Bed #{patient.bedNumber} ({patient.ward})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Discharge Confirmation Modal */}
      {showDischargeConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Confirm Patient Discharge
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Recording discharge will immediately remove <strong>{patient.name}</strong> from active occupancy, free <strong>Bed #{patient.bedNumber}</strong>, and finalize their quarantine record.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discharge Clinical Clearance Notes:
              </label>
              <textarea
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="e.g. Completed 3 fever-free days, negative viral swab, vitals stable."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowDischargeConfirm(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDischarge}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Confirm &amp; Free Bed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Final Outcome Modal */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Record Final Outcome
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Record the verified clinical outcome for {patient.name}. This directly updates facility recovery and mortality analytics.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Outcome Documentation Notes:
                </label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="e.g. Cause of death or clearance documentation."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowOutcomeModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOutcome}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Save Final Outcome
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
