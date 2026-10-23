import React, { useState, useMemo } from 'react';
import { useFacility } from '../../context/FacilityContext';
import {
  Users,
  Search,
  Plus,
  Filter,
  BedDouble,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Thermometer,
  Stethoscope,
  Grid,
  List,
  ShieldAlert,
} from 'lucide-react';
import {
  MAX_FACILITY_CAPACITY,
  findFirstAvailableBed,
  isBedOccupied,
  getWardForBed,
  formatTemp,
  getLatestTemperature,
  evaluateDischargeEligibility,
} from '../../utils/calculations';
import { PatientDetailModal } from './PatientDetailModal';

export const PatientListView: React.FC = () => {
  const {
    patients,
    activeRole,
    facilityDate,
    feverThreshold,
    addPatient,
    patientFilter,
    setPatientFilter,
    selectedPatientId,
    setSelectedPatientId,
    checkPermission,
  } = useFacility();

  const [viewMode, setViewMode] = useState<'table' | 'beds'>('table');
  const [showAddModal, setShowAddModal] = useState(false);

  // New patient form state
  const firstFree = useMemo(() => findFirstAvailableBed(patients) || 1, [patients]);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState<number>(35);
  const [newGender, setNewGender] = useState<'female' | 'male' | 'other'>('female');
  const [newBed, setNewBed] = useState<number>(firstFree);
  const [newAdmissionDate, setNewAdmissionDate] = useState(facilityDate);
  const [newAdmissionTime, setNewAdmissionTime] = useState('09:30');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter values
  const searchQuery = patientFilter.searchQuery || '';
  const statusFilter = patientFilter.status || 'all';
  const wardFilter = patientFilter.ward || 'all';

  const activePatientsCount = patients.filter((p) => p.status === 'active').length;
  const isFacilityFull = activePatientsCount >= MAX_FACILITY_CAPACITY;

  // Filtered list
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = patient.name.toLowerCase().includes(q);
        const matchId = patient.id.toLowerCase().includes(q);
        const matchBed = String(patient.bedNumber).includes(q);
        if (!matchName && !matchId && !matchBed) return false;
      }

      // Status
      if (statusFilter !== 'all' && patient.status !== statusFilter) {
        return false;
      }

      // Ward
      if (wardFilter !== 'all' && patient.ward !== wardFilter) {
        return false;
      }

      // Pending temp checks
      if (patientFilter.pendingTemp) {
        const hasTempToday = patient.temperatureHistory.some((t) => t.date === facilityDate);
        if (hasTempToday || patient.status !== 'active') return false;
      }

      // Pending doctor
      if (patientFilter.pendingDoctor) {
        const hasDoctorToday = patient.doctorVisits.some((v) => v.date === facilityDate);
        if (hasDoctorToday || patient.status !== 'active') return false;
      }

      // Eligible discharge
      if (patientFilter.eligibleDischarge) {
        const elig = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);
        if (!elig.isEligible || patient.status !== 'active') return false;
      }

      return true;
    });
  }, [patients, searchQuery, statusFilter, wardFilter, patientFilter, facilityDate, feverThreshold]);

  // Handle open add modal
  const handleOpenAddModal = () => {
    const perm = checkPermission('add_patient');
    if (!perm.allowed) {
      alert(perm.reason);
      return;
    }
    if (isFacilityFull) {
      alert(`Facility is at maximum capacity (${MAX_FACILITY_CAPACITY}/${MAX_FACILITY_CAPACITY} beds occupied). No new admissions can be accepted.`);
      return;
    }
    const nextFree = findFirstAvailableBed(patients) || 1;
    // Suggest ID
    const nextNum = 1000 + patients.length + 1;
    setNewId(`PT-${nextNum}`);
    setNewName('');
    setNewBed(nextFree);
    setNewAdmissionDate(facilityDate);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSaveNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await addPatient({
        id: newId,
        name: newName,
        age: Number(newAge) || 0,
        gender: newGender,
        bedNumber: Number(newBed),
        admissionDate: newAdmissionDate,
        admissionTime: newAdmissionTime,
      });

      if (res.success) {
        setShowAddModal(false);
      } else {
        setFormError(res.message);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error admitting patient to API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Occupied beds set for fast lookup
  const occupiedBedMap = useMemo(() => {
    const map = new Map<number, typeof patients[0]>();
    for (const p of patients) {
      if (p.status === 'active') {
        map.set(p.bedNumber, p);
      }
    }
    return map;
  }, [patients]);

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Patient Management &amp; Bed Registry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Roster of admitted quarantine cases and bed capacity allocation ({activePatientsCount}/{MAX_FACILITY_CAPACITY} beds occupied)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Roster</span>
            </button>
            <button
              onClick={() => setViewMode('beds')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                viewMode === 'beds'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="74-Bed Facility Matrix View"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bed Map</span>
            </button>
          </div>

          {/* Add Patient Button */}
          <button
            onClick={handleOpenAddModal}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              isFacilityFull
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : activeRole !== 'admin'
                ? 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
            }`}
            title={activeRole !== 'admin' ? 'Administrator role required to admit patients' : ''}
          >
            <Plus className="w-4 h-4" />
            <span>Admit Patient</span>
          </button>
        </div>
      </div>

      {/* Role Permission Hint if Nurse or Doctor */}
      {activeRole !== 'admin' && (
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>
              You are viewing as <strong>{activeRole}</strong>. Patient admissions and bed assignments are restricted to Administrator.
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">Read-Only Registry</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              setPatientFilter((prev) => ({ ...prev, searchQuery: e.target.value }))
            }
            placeholder="Search by patient name, ID (e.g. PT-1001), or bed #..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-xs"
          />
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setPatientFilter((prev) => ({ ...prev, status: 'all' }))}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setPatientFilter((prev) => ({ ...prev, status: 'active' }))}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activePatientsCount})
            </button>
            <button
              onClick={() => setPatientFilter((prev) => ({ ...prev, status: 'discharged' }))}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'discharged'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Discharged ({patients.length - activePatientsCount})
            </button>
          </div>

          <select
            value={wardFilter}
            onChange={(e) =>
              setPatientFilter((prev) => ({ ...prev, ward: e.target.value as any }))
            }
            aria-label="Filter by Ward"
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">All Wards</option>
            <option value="Ward A">Ward A (Beds 1-25)</option>
            <option value="Ward B">Ward B (Beds 26-50)</option>
            <option value="Ward C">Ward C (Beds 51-74)</option>
          </select>
        </div>
      </div>

      {/* Main Content: Table or Bed Map */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-3">Bed &amp; Ward</th>
                  <th className="py-3 px-3">Admitted</th>
                  <th className="py-3 px-3">Today's Temp</th>
                  <th className="py-3 px-3">Afebrile Streak</th>
                  <th className="py-3 px-3">Doctor Visit</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No patients match the selected search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const latestToday = getLatestTemperature(patient, facilityDate);
                    const eligibility = evaluateDischargeEligibility(patient, facilityDate, feverThreshold);
                    const hasVisitToday = patient.doctorVisits.some((v) => v.date === facilityDate);

                    return (
                      <tr
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        {/* Patient info */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{patient.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {patient.id} · {patient.age}y · {patient.gender}
                          </div>
                        </td>

                        {/* Bed */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {patient.status === 'active' ? (
                            <span className="font-mono font-bold text-slate-900">
                              Bed #{patient.bedNumber}
                              <span className="text-[11px] font-sans font-normal text-slate-500 ml-1">
                                ({patient.ward})
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">
                              Released (Ex-Bed #{patient.bedNumber})
                            </span>
                          )}
                        </td>

                        {/* Admission Date */}
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {patient.admissionDate}
                        </td>

                        {/* Today's Temp */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {patient.status === 'active' ? (
                            latestToday ? (
                              <span
                                className={`font-mono font-bold ${
                                  latestToday.isFever ? 'text-rose-600' : 'text-slate-900'
                                }`}
                              >
                                {latestToday.celsius.toFixed(1)}°C
                                {latestToday.isFever && (
                                  <span className="ml-1 text-[10px] font-sans text-rose-600">
                                    (Fever)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-amber-700 font-medium flex items-center gap-1">
                                <Thermometer className="w-3 h-3 text-amber-500" />
                                Pending check
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Consecutive fever-free days */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {patient.status === 'active' ? (
                            eligibility.isEligible ? (
                              <span className="font-bold text-emerald-700 font-mono">
                                3/3 days (Eligible)
                              </span>
                            ) : (
                              <span className="font-mono text-slate-600">
                                {eligibility.consecutiveDays} / 3 days
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Doctor Visit Today */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {patient.status === 'active' ? (
                            hasVisitToday ? (
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Completed
                              </span>
                            ) : (
                              <span className="text-blue-700 font-medium flex items-center gap-1">
                                <Stethoscope className="w-3 h-3 text-blue-500" />
                                Pending round
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {patient.status === 'active' ? (
                            <span className="font-medium text-blue-700">Active</span>
                          ) : (
                            <span className="font-medium text-slate-500">
                              Discharged ({patient.finalOutcome})
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatientId(patient.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bed Map View: Shows all 74 beds */
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Quarantine Facility 74-Bed Map
              </h3>
              <p className="text-xs text-slate-500">
                Visual matrix of all 74 quarantine beds. Click any occupied bed to view patient.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Occupied ({activePatientsCount})
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" /> Available ({MAX_FACILITY_CAPACITY - activePatientsCount})
              </span>
            </div>
          </div>

          {/* Wards Breakdown */}
          {(['Ward A', 'Ward B', 'Ward C'] as const).map((ward) => {
            const startBed = ward === 'Ward A' ? 1 : ward === 'Ward B' ? 26 : 51;
            const endBed = ward === 'Ward A' ? 25 : ward === 'Ward B' ? 50 : 74;
            const bedsList: number[] = [];
            for (let b = startBed; b <= endBed; b++) bedsList.push(b);

            return (
              <div key={ward} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{ward} (Beds #{startBed} - #{endBed})</span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-13 gap-2">
                  {bedsList.map((bedNum) => {
                    const occupying = occupiedBedMap.get(bedNum);
                    const isOcc = !!occupying;

                    return (
                      <button
                        key={bedNum}
                        onClick={() => occupying && setSelectedPatientId(occupying.id)}
                        disabled={!isOcc}
                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          isOcc
                            ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 cursor-pointer shadow-xs'
                            : 'bg-slate-50 border-slate-200 opacity-60 cursor-default'
                        }`}
                        title={
                          isOcc
                            ? `Bed #${bedNum}: Occupied by ${occupying?.name} (${occupying?.id})`
                            : `Bed #${bedNum}: Available`
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-slate-900">
                            #{bedNum}
                          </span>
                          <BedDouble className={`w-3 h-3 ${isOcc ? 'text-blue-600' : 'text-slate-300'}`} />
                        </div>
                        <div className="text-[10px] truncate mt-1 text-slate-600">
                          {isOcc ? occupying?.name.split(' ')[0] : 'Free'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Admit New Patient to Quarantine
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter patient intake details and assign an available bed (Max capacity: 74).
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewPatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Patient ID:
                  </label>
                  <input
                    type="text"
                    required
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g. PT-1011"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bed Assignment (1 - 74):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={MAX_FACILITY_CAPACITY}
                    required
                    value={newBed}
                    onChange={(e) => setNewBed(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Ward: {getWardForBed(newBed)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name (Fictional):
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Age:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="110"
                    required
                    value={newAge}
                    onChange={(e) => setNewAge(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gender:
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Admission Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={newAdmissionDate}
                    onChange={(e) => setNewAdmissionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Admission Time:
                  </label>
                  <input
                    type="time"
                    required
                    value={newAdmissionTime}
                    onChange={(e) => setNewAdmissionTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? 'Admitting...' : 'Confirm Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Patient Detail Modal */}
      {selectedPatientId && (
        <PatientDetailModal
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </div>
  );
};
