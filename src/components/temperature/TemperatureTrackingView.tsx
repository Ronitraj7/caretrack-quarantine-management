import React, { useState, useMemo } from 'react';
import { useFacility } from '../../context/FacilityContext';
import {
  Thermometer,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  AlertTriangle,
  RotateCcw,
  Plus,
  Shield,
  HelpCircle,
} from 'lucide-react';
import {
  formatTemp,
  getLatestTemperature,
  validateTemperatureInput,
} from '../../utils/calculations';

export const TemperatureTrackingView: React.FC = () => {
  const {
    patients,
    activeRole,
    currentUser,
    facilityDate,
    feverThreshold,
    recordTemperature,
    setSelectedPatientId,
  } = useFacility();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed' | 'fever'>('all');

  // Record modal state
  const [activeRecordingPatientId, setActiveRecordingPatientId] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('37.2');
  const [notes, setNotes] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('08:00');
  const [validationError, setValidationError] = useState<string | null>(null);

  const activePatients = useMemo(
    () => patients.filter((p) => p.status === 'active'),
    [patients]
  );

  const filteredPatients = useMemo(() => {
    return activePatients.filter((patient) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const mName = patient.name.toLowerCase().includes(q);
        const mId = patient.id.toLowerCase().includes(q);
        const mBed = String(patient.bedNumber).includes(q);
        if (!mName && !mId && !mBed) return false;
      }

      const latestToday = getLatestTemperature(patient, facilityDate);
      const isCompleteToday = !!latestToday;
      const isFeverToday = latestToday ? latestToday.isFever : false;

      if (filterMode === 'pending' && isCompleteToday) return false;
      if (filterMode === 'completed' && !isCompleteToday) return false;
      if (filterMode === 'fever' && !isFeverToday) return false;

      return true;
    });
  }, [activePatients, search, filterMode, facilityDate]);

  const pendingCount = activePatients.filter(
    (p) => !p.temperatureHistory.some((t) => t.date === facilityDate)
  ).length;

  const completedCount = activePatients.length - pendingCount;

  // Open modal to record reading
  const openRecordingModal = (patientId: string) => {
    const patient = activePatients.find((p) => p.id === patientId);
    if (!patient) return;

    const existingToday = getLatestTemperature(patient, facilityDate);
    // default plausible starting number
    setTempValue(existingToday ? (existingToday.celsius > feverThreshold ? '37.8' : '36.8') : '37.2');
    setNotes('');

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setCustomTime(`${hh}:${mm}`);

    setValidationError(null);
    setActiveRecordingPatientId(patientId);
  };

  const handleSaveTemperature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecordingPatientId) return;

    // Validate first
    const val = validateTemperatureInput(tempValue);
    if (!val.isValid) {
      setValidationError(val.errorMessage || 'Invalid temperature.');
      return;
    }

    const res = recordTemperature(activeRecordingPatientId, tempValue, notes, customTime);
    if (res.success) {
      setActiveRecordingPatientId(null);
    } else {
      setValidationError(res.message);
    }
  };

  const recordingPatient = activePatients.find((p) => p.id === activeRecordingPatientId);
  const patientReadingsToday = recordingPatient
    ? recordingPatient.temperatureHistory.filter((t) => t.date === facilityDate)
    : [];

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Daily Temperature Surveillance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift surveillance for facility date <strong className="font-mono text-slate-700">{facilityDate}</strong> · Fever cutoff: <span className="font-mono text-rose-600 font-semibold">≥{feverThreshold.toFixed(1)}°C</span>
          </p>
        </div>

        {/* Status Counts */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            Pending Checks: <strong className="font-mono">{pendingCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
            Completed: <strong className="font-mono">{completedCount}</strong>
          </div>
        </div>
      </div>

      {/* Prototype Rule Assumption Notice */}
      <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">Clinical Protocol Assumption: </span>
          The fever cutoff of <strong>{feverThreshold.toFixed(1)}°C</strong> is a configurable prototype demonstration assumption. Multiple readings per calendar day are permitted and recorded in sequence without overwriting previous readings.
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active patients by name, ID, or bed..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
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
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'completed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            onClick={() => setFilterMode('fever')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'fever'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Febrile (≥{feverThreshold.toFixed(1)}°C)
          </button>
        </div>
      </div>

      {/* Patient Temperature Cards / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            No active patients match the current filter.
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const todayReadings = patient.temperatureHistory.filter(
              (t) => t.date === facilityDate
            );
            const latestToday = getLatestTemperature(patient, facilityDate);
            const isCompleted = todayReadings.length > 0;
            const isFever = latestToday ? latestToday.isFever : false;

            return (
              <div
                key={patient.id}
                className={`p-4 bg-white rounded-xl border transition-all flex flex-col justify-between ${
                  isFever
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : isCompleted
                    ? 'border-slate-200 hover:border-slate-300'
                    : 'border-amber-300 ring-1 ring-amber-100'
                }`}
              >
                <div>
                  {/* Card top */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {patient.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {patient.id} · Bed #{patient.bedNumber} ({patient.ward})
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded font-mono ${
                        isFever
                          ? 'bg-rose-100 text-rose-800'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isFever
                        ? 'FEVER'
                        : isCompleted
                        ? 'CHECKED'
                        : 'PENDING CHECK'}
                    </span>
                  </div>

                  {/* Temperature readout */}
                  <div className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Today's Latest Reading:
                      </span>
                      {latestToday ? (
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-2xl font-bold font-mono ${
                              latestToday.isFever ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {latestToday.celsius.toFixed(1)}°C
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            at {latestToday.time}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-800 font-semibold text-xs flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          No check recorded today
                        </span>
                      )}
                    </div>

                    {latestToday && (
                      <div className="text-right text-[11px] text-slate-500">
                        <div>{latestToday.recordedBy.split(' ')[0]}</div>
                        {todayReadings.length > 1 && (
                          <span className="text-[10px] text-blue-700 font-mono font-medium">
                            {todayReadings.length} readings today
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes snippet if any */}
                  {latestToday?.notes && (
                    <p className="text-[11px] text-slate-600 italic line-clamp-1 mb-2">
                      &ldquo;{latestToday.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View History</span>
                  </button>

                  <button
                    onClick={() => openRecordingModal(patient.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isCompleted
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    }`}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Repeat Check' : 'Record Temp'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Temperature Modal */}
      {activeRecordingPatientId && recordingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Record Temperature Measurement
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: <strong className="text-slate-800">{recordingPatient.name}</strong> ({recordingPatient.id}) · Bed #{recordingPatient.bedNumber}
                </p>
              </div>
              <button
                onClick={() => setActiveRecordingPatientId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Repeat check preservation notice if already had reading today */}
            {patientReadingsToday.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <div className="font-semibold flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-700" />
                  Repeat Measurement Preservation
                </div>
                <div className="text-[11px] text-blue-800 mt-0.5">
                  This patient already has {patientReadingsToday.length} reading(s) recorded today (latest: {patientReadingsToday[patientReadingsToday.length - 1].celsius.toFixed(1)}°C at {patientReadingsToday[patientReadingsToday.length - 1].time}). This new reading will be added without overwriting existing records.
                </div>
              </div>
            )}

            {validationError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTemperature} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Temperature (°C):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="30.0"
                    max="45.0"
                    required
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder="e.g. 37.4"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                    °C
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>Plausible range: 30.0°C - 45.0°C</span>
                  <span className="font-semibold text-rose-600 font-mono">
                    Fever cutoff: ≥{feverThreshold.toFixed(1)}°C
                  </span>
                </div>
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Presets:</span>
                {['36.6', '37.1', '38.2', '38.8', '39.4'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTempValue(val)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono text-slate-700 transition-colors"
                  >
                    {val}°
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Facility Date:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={facilityDate}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Measurement Time:
                  </label>
                  <input
                    type="time"
                    required
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Notes / Context (Optional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Oral thermometer; patient flushed; antipyretic administered."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                Recording Staff: <strong className="text-slate-800 font-sans">{currentUser.name}</strong> ({currentUser.title})
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveRecordingPatientId(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
