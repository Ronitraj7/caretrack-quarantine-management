/**
 * CareTrack - Facility State Context
 * Connects to JSON Server REST API backend with resilient local fallback for offline/preview mode.
 * Centralized service integration, validation, and role permissions.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import {
  Patient,
  UserRole,
  UserProfile,
  ActiveTab,
  FacilityMetrics,
  ActivityLog,
  DischargeEvent,
  OutcomeEvent,
} from '../types';
import {
  INITIAL_PATIENTS,
  DEFAULT_FACILITY_DATE,
  MOCK_USERS,
} from '../data/seedData';
import {
  calculateFacilityMetrics,
  DEFAULT_FEVER_THRESHOLD,
  evaluateDischargeEligibility,
} from '../utils/calculations';
import { FacilityService } from '../services/facilityService';
import { API_BASE_URL } from '../services/apiClient';

interface PatientFilter {
  searchQuery?: string;
  status?: 'all' | 'active' | 'discharged';
  ward?: 'all' | 'Ward A' | 'Ward B' | 'Ward C';
  pendingTemp?: boolean;
  pendingDoctor?: boolean;
  eligibleDischarge?: boolean;
  feverToday?: boolean;
}

export type ApiConnectionStatus = 'connected' | 'offline_fallback' | 'checking';

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

  // JSON Server REST API backend state
  apiStatus: ApiConnectionStatus;
  apiEndpoint: string;
  apiMessage: string;
  isLoading: boolean;
  isSyncing: boolean;
  activityLogs: ActivityLog[];
  discharges: DischargeEvent[];
  outcomes: OutcomeEvent[];

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
  reconnectApi: () => Promise<void>;

  // Actions (Asynchronous service operations)
  addPatient: (data: {
    id: string;
    name: string;
    age: number;
    gender: 'female' | 'male' | 'other';
    bedNumber: number;
    admissionDate: string;
    admissionTime: string;
  }) => Promise<{ success: boolean; message: string }>;

  recordTemperature: (
    patientId: string,
    celsiusStr: string | number,
    notes?: string,
    customTime?: string
  ) => Promise<{ success: boolean; message: string }>;

  recordDoctorVisit: (
    patientId: string,
    data: {
      clinicalNotes: string;
      treatmentUpdates: string;
      respiratoryStatus: 'normal' | 'mild_distress' | 'moderate_distress' | 'severe';
      recommendDischargeReview: boolean;
    }
  ) => Promise<{ success: boolean; message: string }>;

  grantDoctorClearance: (
    patientId: string,
    clinicalJustification: string
  ) => Promise<{ success: boolean; message: string }>;

  revokeDoctorClearance: (
    patientId: string,
    reason: string
  ) => Promise<{ success: boolean; message: string }>;

  recordDischarge: (
    patientId: string,
    notes?: string
  ) => Promise<{ success: boolean; message: string }>;

  recordFinalOutcome: (
    patientId: string,
    outcome: 'recovered' | 'deceased',
    notes?: string
  ) => Promise<{ success: boolean; message: string }>;

  resetDemoData: () => Promise<void>;

  // Helpers
  checkPermission: (
    action: 'add_patient' | 'record_temp' | 'doctor_visit' | 'grant_clearance' | 'discharge' | 'record_outcome'
  ) => {
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
  // Local fallback storage initialization
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

  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROLE);
      if (stored && (stored === 'nurse' || stored === 'doctor' || stored === 'admin')) {
        return stored as UserRole;
      }
    } catch {}
    return 'admin';
  });

  const [facilityDate, setFacilityDateState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DATE);
      if (stored) return stored;
    } catch {}
    return DEFAULT_FACILITY_DATE;
  });

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

  // API Backend connection state
  const [apiStatus, setApiStatus] = useState<ApiConnectionStatus>('checking');
  const [apiMessage, setApiMessage] = useState<string>('Testing connection to JSON Server REST backend...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [discharges, setDischarges] = useState<DischargeEvent[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeEvent[]>([]);

  const currentUser = MOCK_USERS[activeRole] || MOCK_USERS.admin;

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  // Save to LocalStorage as safe offline backup
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

  // Re-fetch and synchronize with JSON Server
  const loadDataFromApi = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsSyncing(true);

    try {
      const health = await FacilityService.checkBackendHealth();
      if (health.online) {
        const [remotePatients, remoteLogs, remoteDischarges, remoteOutcomes, remoteConfig] = await Promise.all([
          FacilityService.loadPatients(),
          FacilityService.loadActivityLogs(),
          FacilityService.loadDischarges(),
          FacilityService.loadOutcomes(),
          FacilityService.loadFacilityConfig(),
        ]);

        if (remotePatients && remotePatients.length > 0) {
          setPatients(remotePatients);
        }
        if (remoteLogs) setActivityLogs(remoteLogs);
        if (remoteDischarges) setDischarges(remoteDischarges);
        if (remoteOutcomes) setOutcomes(remoteOutcomes);
        if (remoteConfig?.feverThreshold) setFeverThresholdState(remoteConfig.feverThreshold);

        setApiStatus('connected');
        setApiMessage(`Active connection: JSON Server at ${API_BASE_URL}`);
      } else {
        setApiStatus('offline_fallback');
        setApiMessage(`JSON Server offline at ${API_BASE_URL}. Operating in browser local demo fallback mode.`);
      }
    } catch {
      setApiStatus('offline_fallback');
      setApiMessage(`JSON Server offline at ${API_BASE_URL}. Operating in browser local demo fallback mode.`);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDataFromApi(true);
  }, [loadDataFromApi]);

  const reconnectApi = async () => {
    showNotification('info', `Checking JSON Server connection at ${API_BASE_URL}...`);
    await loadDataFromApi(false);
  };

  // Role permissions checker
  const checkPermission = useCallback(
    (action: 'add_patient' | 'record_temp' | 'doctor_visit' | 'grant_clearance' | 'discharge' | 'record_outcome'): {
      allowed: boolean;
      reason?: string;
    } => {
      switch (action) {
        case 'add_patient':
          if (activeRole !== 'admin') {
            return {
              allowed: false,
              reason: 'Patient admission and bed assignment requires Administrator role. Switch to Administrator to admit patients.',
            };
          }
          return { allowed: true };

        case 'record_temp':
          return { allowed: true };

        case 'doctor_visit':
          if (activeRole !== 'doctor') {
            return {
              allowed: false,
              reason: 'Conducting consultations and treatment plans requires Doctor role. Switch to Doctor to record consultations.',
            };
          }
          return { allowed: true };

        case 'grant_clearance':
          if (activeRole !== 'doctor') {
            return {
              allowed: false,
              reason: 'Issuing medical clearance requires Doctor role. Switch to Doctor to evaluate and grant clinical clearance.',
            };
          }
          return { allowed: true };

        case 'discharge':
          if (activeRole !== 'admin') {
            return {
              allowed: false,
              reason: 'Authorizing final discharge and bed release requires Administrator role. Switch to Administrator to complete discharges.',
            };
          }
          return { allowed: true };

        case 'record_outcome':
          if (activeRole !== 'admin') {
            return {
              allowed: false,
              reason: 'Certifying final epidemiological patient outcomes requires Administrator role. Switch to Administrator to record outcomes.',
            };
          }
          return { allowed: true };

        default:
          return { allowed: true };
      }
    },
    [activeRole]
  );

  // -------------------------------------------------------------
  // Action Handlers
  // -------------------------------------------------------------

  // 1. Add Patient
  const addPatient = async (data: {
    id: string;
    name: string;
    age: number;
    gender: 'female' | 'male' | 'other';
    bedNumber: number;
    admissionDate: string;
    admissionTime: string;
  }): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);

    const res = await FacilityService.admitPatient(
      {
        ...data,
        ward: data.bedNumber <= 25 ? 'Ward A' : data.bedNumber <= 50 ? 'Ward B' : 'Ward C',
      },
      patients,
      currentUser
    );

    setIsSyncing(false);

    if (res.success && res.data) {
      setPatients((prev) => [res.data as Patient, ...prev]);
      showNotification('success', res.message);
      return { success: true, message: res.message };
    } else {
      showNotification('error', res.message);
      return { success: false, message: res.message };
    }
  };

  // 2. Record Temperature
  const recordTemperature = async (
    patientId: string,
    celsiusStr: string | number,
    notes?: string,
    customTime?: string
  ): Promise<{ success: boolean; message: string }> => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient record not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    const isRepeat = patient.temperatureHistory.some((t) => t.date === facilityDate);
    setIsSyncing(true);

    const res = await FacilityService.recordTemperature(
      patientId,
      celsiusStr,
      notes || '',
      isRepeat,
      patient,
      facilityDate,
      feverThreshold,
      currentUser
    );

    setIsSyncing(false);

    if (res.success && res.data) {
      const newReading = res.data;
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          const isFever = newReading.isFever;
          return {
            ...p,
            temperatureHistory: [...p.temperatureHistory, newReading],
            doctorClearance: isFever && p.doctorClearance?.isCleared ? undefined : p.doctorClearance,
          };
        })
      );
      showNotification('success', res.message);
      return { success: true, message: res.message };
    } else {
      showNotification('error', res.message);
      return { success: false, message: res.message };
    }
  };

  // 3. Record Doctor Visit
  const recordDoctorVisit = async (
    patientId: string,
    data: {
      clinicalNotes: string;
      treatmentUpdates: string;
      respiratoryStatus: 'normal' | 'mild_distress' | 'moderate_distress' | 'severe';
      recommendDischargeReview: boolean;
    }
  ): Promise<{ success: boolean; message: string }> => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient record not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    setIsSyncing(true);

    const res = await FacilityService.recordDoctorVisit(
      patientId,
      data,
      patient,
      facilityDate,
      currentUser
    );

    setIsSyncing(false);

    if (res.success && res.data) {
      const newVisit = res.data;
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          return {
            ...p,
            doctorVisits: [...p.doctorVisits, newVisit],
          };
        })
      );
      showNotification('success', res.message);
      return { success: true, message: res.message };
    } else {
      showNotification('error', res.message);
      return { success: false, message: res.message };
    }
  };

  // 4. Grant Doctor Clearance (Stage 2)
  const grantDoctorClearance = async (
    patientId: string,
    clinicalJustification: string
  ): Promise<{ success: boolean; message: string }> => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient record not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    setIsSyncing(true);

    const res = await FacilityService.grantDoctorClearance(
      patientId,
      clinicalJustification,
      patient,
      facilityDate,
      feverThreshold,
      currentUser
    );

    setIsSyncing(false);

    if (res.success) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          return {
            ...p,
            doctorClearance: {
              isCleared: true,
              clearedDate: facilityDate,
              clearedTime: timeStr,
              doctorName: currentUser.name,
              doctorId: currentUser.id,
              clinicalJustification: clinicalJustification.trim(),
            },
          };
        })
      );
      showNotification('success', res.message);
      return { success: true, message: res.message };
    } else {
      showNotification('error', res.message);
      return { success: false, message: res.message };
    }
  };

  // 5. Revoke Doctor Clearance
  const revokeDoctorClearance = async (
    patientId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient record not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    setIsSyncing(true);
    const res = await FacilityService.revokeDoctorClearance(
      patientId,
      reason,
      patient,
      facilityDate,
      currentUser
    );
    setIsSyncing(false);

    if (res.success) {
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          return {
            ...p,
            doctorClearance: undefined,
          };
        })
      );
      showNotification('info', res.message);
      return { success: true, message: res.message };
    } else {
      showNotification('error', res.message);
      return { success: false, message: res.message };
    }
  };

  // 6. Record Administrative Discharge (Stage 3)
  const recordDischarge = async (
    patientId: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient record not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    setIsSyncing(true);

    const res = await FacilityService.completeAdminDischarge(
      patientId,
      notes || '',
      patient,
      facilityDate,
      feverThreshold,
      currentUser
    );

    setIsSyncing(false);

    if (res.success) {
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          return {
            ...p,
            status: 'discharged',
            dischargeDate: facilityDate,
            dischargeAuthorizedBy: `${currentUser.name} (${currentUser.title})`,
          };
        })
      );
      showNotification('success', res.message);
      return { success: true, message: res.message };
    } else {
      showNotification('error', res.message);
      return { success: false, message: res.message };
    }
  };

  // 7. Record Final Clinical Outcome
  const recordFinalOutcome = async (
    patientId: string,
    outcome: 'recovered' | 'deceased',
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      const msg = 'Patient record not found.';
      showNotification('error', msg);
      return { success: false, message: msg };
    }

    setIsSyncing(true);

    const res = await FacilityService.recordFinalOutcome(
      patientId,
      outcome,
      notes || '',
      patient,
      facilityDate,
      currentUser
    );

    setIsSyncing(false);

    if (res.success) {
      const newAuditEntry = {
        outcome,
        date: facilityDate,
        recordedBy: `${currentUser.name} (${currentUser.role})`,
        notes: notes?.trim() || undefined,
        timestamp: Date.now(),
      };

      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          return {
            ...p,
            finalOutcome: outcome,
            outcomeDate: facilityDate,
            outcomeRecordedBy: currentUser.name,
            outcomeNotes: notes?.trim() || undefined,
            outcomeHistory: [...(p.outcomeHistory || []), newAuditEntry],
          };
        })
      );
      showNotification('success', res.message);
      return { success: true, message: res.message };
    } else {
      showNotification('error', res.message);
      return { success: false, message: res.message };
    }
  };

  // 8. Reset to Seed Data
  const resetDemoData = async () => {
    localStorage.removeItem(STORAGE_KEY_PATIENTS);
    setPatients(INITIAL_PATIENTS);
    setFacilityDateState(DEFAULT_FACILITY_DATE);
    setFeverThresholdState(DEFAULT_FEVER_THRESHOLD);
    showNotification('info', 'Demo patient database reset to initial reference state.');
    if (apiStatus === 'connected') {
      await loadDataFromApi(false);
    }
  };

  // Dynamic Metrics calculation
  const metrics = useMemo(() => {
    return calculateFacilityMetrics(patients, facilityDate, feverThreshold);
  }, [patients, facilityDate, feverThreshold]);

  const value = {
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
    apiStatus,
    apiEndpoint: API_BASE_URL,
    apiMessage,
    isLoading,
    isSyncing,
    activityLogs,
    discharges,
    outcomes,
    setActiveRole,
    setFacilityDate,
    setFeverThreshold,
    setActiveTab,
    setPatientFilter,
    setSelectedPatientId,
    setAssessmentGuideOpen,
    setAboutModalOpen,
    clearNotification,
    reconnectApi,
    addPatient,
    recordTemperature,
    recordDoctorVisit,
    grantDoctorClearance,
    revokeDoctorClearance,
    recordDischarge,
    recordFinalOutcome,
    resetDemoData,
    checkPermission,
  };

  return <FacilityContext.Provider value={value}>{children}</FacilityContext.Provider>;
};

export const useFacility = () => {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within a FacilityProvider');
  }
  return context;
};
