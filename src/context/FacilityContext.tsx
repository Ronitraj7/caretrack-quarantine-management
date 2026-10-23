/**
 * CareTrack - Facility State Context
 * Handles local persistence, role permissions, daily workflows, and audit logging.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Patient,
  UserRole,
  UserProfile,
  ActiveTab,
  FacilityMetrics,
} from '../types';
import {
  INITIAL_PATIENTS,
  DEFAULT_FACILITY_DATE,
  MOCK_USERS,
} from '../data/seedData';
import {
  calculateFacilityMetrics,
  isBedOccupied,
  getWardForBed,
  validateTemperatureInput,
  MAX_FACILITY_CAPACITY,
  DEFAULT_FEVER_THRESHOLD,
  isDailyTemperatureComplete,
  getLatestTemperature,
} from '../utils/calculations';

interface PatientFilter {
  searchQuery?: string;
  status?: 'all' | 'active' | 'discharged';
  ward?: 'all' | 'Ward A' | 'Ward B' | 'Ward C';
  pendingTemp?: boolean;
  pendingDoctor?: boolean;
  eligibleDischarge?: boolean;
  feverToday?: boolean;
}

interface FacilityContextType {
  // State
  patients: Patient[];
  activeRole: UserRole;
  currentUser: UserProfile;
  facilityDate: string;
  feverThreshold: number;
  activeTab: ActiveTab;
  patientFilter: PatientFilter;
  selectedPatientId: string | null;
  metrics: FacilityMetrics;
  assessmentGuideOpen: boolean;
  aboutModalOpen: boolean;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;

  // State Setters
  setActiveRole: (role: UserRole) => void;
  setFacilityDate: (date: string) => void;
  setFeverThreshold: (temp: number) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setPatientFilter: (filter: PatientFilter | ((prev: PatientFilter) => PatientFilter)) => void;
  setSelectedPatientId: (id: string | null) => void;
  setAssessmentGuideOpen: (open: boolean) => void;
  setAboutModalOpen: (open: boolean) => void;
  clearNotification: () => void;

  // Actions
  addPatient: (data: {
    id: string;
    name: string;
    age: number;
    gender: 'female' | 'male' | 'other';
    bedNumber: number;
    admissionDate: string;
    admissionTime: string;
  }) => { success: boolean; message: string };

  recordTemperature: (
    patientId: string,
    celsiusStr: string | number,
    notes?: string,
    customTime?: string
  ) => { success: boolean; message: string };

  recordDoctorVisit: (
    patientId: string,
    data: {
      clinicalNotes: string;
      treatmentUpdates: string;
      respiratoryStatus: 'normal' | 'mild_distress' | 'moderate_distress' | 'severe';
      recommendDischargeReview: boolean;
    }
  ) => { success: boolean; message: string };

  recordDischarge: (
    patientId: string,
    notes?: string
  ) => { success: boolean; message: string };

  recordFinalOutcome: (
    patientId: string,
    outcome: 'recovered' | 'deceased',
    notes?: string
  ) => { success: boolean; message: string };

  resetDemoData: () => void;

  // Helpers
  checkPermission: (action: 'add_patient' | 'record_temp' | 'doctor_visit' | 'discharge' | 'record_outcome') => {
    allowed: boolean;
    reason?: string;
  };
}

const STORAGE_KEY_PATIENTS = 'caretrack_patients_v1';
const STORAGE_KEY_ROLE = 'caretrack_role_v1';
const STORAGE_KEY_DATE = 'caretrack_date_v1';
const STORAGE_KEY_THRESHOLD = 'caretrack_threshold_v1';

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

export const FacilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load persisted patients or seed data
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // LocalStorage error fallback
    }
    return INITIAL_PATIENTS;
  });

  // Active role
  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROLE);
      if (stored && (stored === 'nurse' || stored === 'doctor' || stored === 'admin')) {
        return stored as UserRole;
      }
    } catch {}
    return 'admin'; // Start with Administrator so reviewer sees broad controls
  });

  // Facility Date
  const [facilityDate, setFacilityDateState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DATE);
      if (stored) return stored;
    } catch {}
    return DEFAULT_FACILITY_DATE;
  });

  // Fever Threshold
  const [feverThreshold, setFeverThresholdState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_THRESHOLD);
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 37.0 && val <= 40.0) return val;
      }
    } catch {}
    return DEFAULT_FEVER_THRESHOLD;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [patientFilter, setPatientFilter] = useState<PatientFilter>({ status: 'all' });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [assessmentGuideOpen, setAssessmentGuideOpen] = useState<boolean>(false);
  const [aboutModalOpen, setAboutModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [patients]);

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, role);
    } catch {}
  };

  const setFacilityDate = (date: string) => {
    setFacilityDateState(date);
    try {
      localStorage.setItem(STORAGE_KEY_DATE, date);
    } catch {}
  };

  const setFeverThreshold = (threshold: number) => {
    setFeverThresholdState(threshold);
    try {
      localStorage.setItem(STORAGE_KEY_THRESHOLD, String(threshold));
    } catch {}
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const clearNotification = () => setNotification(null);

  const currentUser = MOCK_USERS[activeRole] || MOCK_USERS.admin;

  // Role permissions checker
  const checkPermission = (action: 'add_patient' | 'record_temp' | 'doctor_visit' | 'discharge' | 'record_outcome'): {
    allowed: boolean;
    reason?: string;
  } => {
    switch (action) {
      case 'add_patient':
        if (activeRole !== 'admin') {
          return {
            allowed: false,
            reason: 'Patient admission and bed assignment requires Administrator role.',
          };
        }
        return { allowed: true };

      case 'record_temp':
        // Nurses are primary, but Doctors and Admins can also record in clinical workflows
        return { allowed: true };

      case 'doctor_visit':
        if (activeRole !== 'doctor') {
          return {
            allowed: false,
            reason: 'Clinical consultations and treatment updates require Doctor role.',
          };
        }
        return { allowed: true };

      case 'discharge':
        if (activeRole === 'nurse') {
          return {
            allowed: false,
            reason: 'Nurses cannot authorize patient discharges. Requires Administrator or Doctor authorization.',
          };
        }
        return { allowed: true };

      case 'record_outcome':
        if (activeRole === 'nurse') {
          return {
            allowed: false,
            reason: 'Recording final clinical outcomes (recovery/death) requires Administrator or Doctor role.',
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  };

  // Add Patient
  const addPatient = (data: {
    id: string;
    name: string;
    age: number;
    gender: 'female' | 'male' | 'other';
    bedNumber: number;
    admissionDate: string;
    admissionTime: string;
  }): { success: boolean; message: string } => {
    // 1. Role verification
    const perm = checkPermission('add_patient');
    if (!perm.allowed) {
      showNotification('error', perm.reason || 'Permission denied.');
      return { success: false, message: perm.reason || 'Permission denied.' };
    }

    // 2. Capacity Check (Max 74)
    const activeCount = patients.filter((p) => p.status === 'active').length;
    if (activeCount >= MAX_FACILITY_CAPACITY) {
      const msg = `Admission rejected: Facility at maximum capacity (${MAX_FACILITY_CAPACITY}/${MAX_FACILITY_CAPACITY} beds occupied).`;
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    // 3. ID Validation
    const cleanId = data.id.trim().toUpperCase();
    if (!cleanId) {
      const msg = 'Patient ID is required.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }
    if (patients.some((p) => p.id.toUpperCase() === cleanId)) {
      const msg = `Duplicate Patient ID: Patient with ID "${cleanId}" already exists in the system.`;
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    // 4. Bed Validation
    if (data.bedNumber < 1 || data.bedNumber > MAX_FACILITY_CAPACITY) {
      const msg = `Invalid bed number: Bed must be between 1 and ${MAX_FACILITY_CAPACITY}.`;
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    // 5. Duplicate Active Bed Check
    if (isBedOccupied(data.bedNumber, patients)) {
      const occupyingPatient = patients.find(
        (p) => p.status === 'active' && p.bedNumber === data.bedNumber
      );
      const msg = `Bed Collision: Bed #${data.bedNumber} is already occupied by ${occupyingPatient?.name} (${occupyingPatient?.id}).`;
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    // 6. Name validation
    if (!data.name.trim()) {
      const msg = 'Patient name is required.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    const newPatient: Patient = {
      id: cleanId,
      name: data.name.trim(),
      age: Number(data.age) || 0,
      gender: data.gender,
      admissionDate: data.admissionDate || facilityDate,
      admissionTime: data.admissionTime || '09:00',
      bedNumber: data.bedNumber,
      ward: getWardForBed(data.bedNumber),
      status: 'active',
      finalOutcome: 'active',
      temperatureHistory: [],
      doctorVisits: [],
    };

    setPatients((prev) => [newPatient, ...prev]);
    const successMsg = `Patient ${newPatient.name} (${newPatient.id}) admitted to Bed #${newPatient.bedNumber} (${newPatient.ward}).`;
    showNotification('success', successMsg);
    return { success: true, message: successMsg };
  };

  // Record Temperature
  const recordTemperature = (
    patientId: string,
    celsiusInput: string | number,
    notes?: string,
    customTime?: string
  ): { success: boolean; message: string } => {
    // 1. Validate measurement
    const validation = validateTemperatureInput(celsiusInput);
    if (!validation.isValid || validation.numValue === null) {
      const msg = validation.errorMessage || 'Invalid temperature value.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    const tempCelsius = validation.numValue;
    const isFever = tempCelsius >= feverThreshold;

    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    if (patient.status !== 'active') {
      const msg = 'Cannot record temperature for a discharged patient.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    // Check if repeat measurement today
    const alreadyHadReadingToday = isDailyTemperatureComplete(patient, facilityDate);
    const now = new Date();
    const currentTimeStr =
      customTime ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newReading = {
      id: `TR-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      date: facilityDate,
      time: currentTimeStr,
      timestamp: Date.now(),
      celsius: tempCelsius,
      isFever,
      recordedBy: currentUser.name,
      recordedByRole: currentUser.role,
      notes: notes?.trim() || undefined,
      isRepeatMeasurement: alreadyHadReadingToday,
    };

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          // Append reading to history without overwriting previous readings!
          temperatureHistory: [...p.temperatureHistory, newReading],
        };
      })
    );

    const feverLabel = isFever ? ' (FEVER DETECTED)' : ' (Afebrile)';
    const repeatLabel = alreadyHadReadingToday ? ' [Repeat measurement preserved]' : '';
    const successMsg = `Recorded ${tempCelsius.toFixed(1)}°C${feverLabel} for ${patient.name} by ${currentUser.name}.${repeatLabel}`;
    showNotification('success', successMsg);
    return { success: true, message: successMsg };
  };

  // Record Doctor Visit
  const recordDoctorVisit = (
    patientId: string,
    data: {
      clinicalNotes: string;
      treatmentUpdates: string;
      respiratoryStatus: 'normal' | 'mild_distress' | 'moderate_distress' | 'severe';
      recommendDischargeReview: boolean;
    }
  ): { success: boolean; message: string } => {
    const perm = checkPermission('doctor_visit');
    if (!perm.allowed) {
      showNotification('error', perm.reason || 'Permission denied.');
      return { success: false, message: perm.reason || 'Permission denied.' };
    }

    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    if (patient.status !== 'active') {
      const msg = 'Cannot record consultation for a discharged patient.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    // Check accidental duplicate consultation today
    const existingVisitToday = patient.doctorVisits.find((v) => v.date === facilityDate);
    if (existingVisitToday) {
      const msg = `Accidental duplicate prevented: Consultation for ${patient.name} was already recorded today at ${existingVisitToday.time} by ${existingVisitToday.doctorName}.`;
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    const latestTempToday = getLatestTemperature(patient, facilityDate);
    const temperatureWasPending = !latestTempToday;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newVisit = {
      id: `DV-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      date: facilityDate,
      time: timeStr,
      timestamp: Date.now(),
      doctorName: currentUser.name,
      doctorId: currentUser.id,
      clinicalNotes: data.clinicalNotes.trim(),
      treatmentUpdates: data.treatmentUpdates.trim(),
      respiratoryStatus: data.respiratoryStatus,
      temperatureAtConsultation: latestTempToday ? latestTempToday.celsius : undefined,
      temperatureWasPending,
      recommendDischargeReview: data.recommendDischargeReview,
    };

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          doctorVisits: [...p.doctorVisits, newVisit],
        };
      })
    );

    const warnPending = temperatureWasPending ? ' [Warning: Temp check was pending at time of consult]' : '';
    const successMsg = `Doctor consultation completed for ${patient.name} by ${currentUser.name}.${warnPending}`;
    showNotification('success', successMsg);
    return { success: true, message: successMsg };
  };

  // Record Discharge
  const recordDischarge = (
    patientId: string,
    notes?: string
  ): { success: boolean; message: string } => {
    const perm = checkPermission('discharge');
    if (!perm.allowed) {
      showNotification('error', perm.reason || 'Permission denied.');
      return { success: false, message: perm.reason || 'Permission denied.' };
    }

    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    if (patient.status === 'discharged') {
      const msg = 'Patient is already discharged. Completed discharges cannot be modified.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    const freedBedNumber = patient.bedNumber;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          status: 'discharged',
          dischargeDate: facilityDate,
          dischargeAuthorizedBy: `${currentUser.name} (${currentUser.title})`,
          // Default final outcome on discharge is 'recovered' if not already set,
          // but administrator can also specify or update
          finalOutcome: p.finalOutcome === 'active' ? 'recovered' : p.finalOutcome,
          outcomeDate: facilityDate,
          outcomeRecordedBy: `${currentUser.name} (${currentUser.title})`,
          outcomeNotes: notes?.trim() || 'Discharged from facility after meeting clearance criteria.',
        };
      })
    );

    const successMsg = `Patient ${patient.name} (${patient.id}) successfully discharged! Bed #${freedBedNumber} is now free and available.`;
    showNotification('success', successMsg);
    return { success: true, message: successMsg };
  };

  // Record Final Outcome
  const recordFinalOutcome = (
    patientId: string,
    outcome: 'recovered' | 'deceased',
    notes?: string
  ): { success: boolean; message: string } => {
    const perm = checkPermission('record_outcome');
    if (!perm.allowed) {
      showNotification('error', perm.reason || 'Permission denied.');
      return { success: false, message: perm.reason || 'Permission denied.' };
    }

    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          finalOutcome: outcome,
          outcomeDate: facilityDate,
          outcomeRecordedBy: `${currentUser.name} (${currentUser.title})`,
          outcomeNotes: notes?.trim() || undefined,
          // If deceased while active, also release bed and discharge
          ...(outcome === 'deceased' && p.status === 'active'
            ? {
                status: 'discharged' as const,
                dischargeDate: facilityDate,
                dischargeAuthorizedBy: `${currentUser.name} (Clinical Decease Record)`,
              }
            : {}),
        };
      })
    );

    const outcomeText = outcome === 'recovered' ? 'Recovered' : 'Deceased';
    const successMsg = `Final outcome for ${patient.name} recorded as "${outcomeText}". Analytics metrics updated immediately.`;
    showNotification('success', successMsg);
    return { success: true, message: successMsg };
  };

  // Reset Demo Data
  const resetDemoData = () => {
    setPatients(INITIAL_PATIENTS);
    setFacilityDateState(DEFAULT_FACILITY_DATE);
    setFeverThresholdState(DEFAULT_FEVER_THRESHOLD);
    try {
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(INITIAL_PATIENTS));
      localStorage.setItem(STORAGE_KEY_DATE, DEFAULT_FACILITY_DATE);
      localStorage.setItem(STORAGE_KEY_THRESHOLD, String(DEFAULT_FEVER_THRESHOLD));
    } catch {}
    showNotification('info', 'Prototype restored to pristine initial seed state.');
  };

  // Recalculate metrics immediately when patients, facilityDate, or feverThreshold changes
  const metrics = useMemo(() => {
    return calculateFacilityMetrics(patients, facilityDate, feverThreshold);
  }, [patients, facilityDate, feverThreshold]);

  return (
    <FacilityContext.Provider
      value={{
        patients,
        activeRole,
        currentUser,
        facilityDate,
        feverThreshold,
        activeTab,
        patientFilter,
        selectedPatientId,
        metrics,
        assessmentGuideOpen,
        aboutModalOpen,
        notification,

        setActiveRole,
        setFacilityDate,
        setFeverThreshold,
        setActiveTab,
        setPatientFilter,
        setSelectedPatientId,
        setAssessmentGuideOpen,
        setAboutModalOpen,
        clearNotification,

        addPatient,
        recordTemperature,
        recordDoctorVisit,
        recordDischarge,
        recordFinalOutcome,
        resetDemoData,
        checkPermission,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
};

export const useFacility = () => {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within a FacilityProvider');
  }
  return context;
};
