/**
 * CareTrack - Virus Quarantine & Treatment Facility Management
 * Types and Domain Model
 */

export type UserRole = 'nurse' | 'doctor' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  licenseNumber: string;
}

export type PatientStatus = 'active' | 'discharged';
export type FinalOutcome = 'active' | 'recovered' | 'deceased';

export interface TemperatureReading {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD facility-local date
  time: string; // HH:mm
  timestamp: number; // Unix ms
  celsius: number;
  isFever: boolean;
  recordedBy: string;
  recordedByRole: UserRole;
  notes?: string;
  isRepeatMeasurement?: boolean;
}

export interface DoctorVisit {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD facility-local date
  time: string; // HH:mm
  timestamp: number;
  doctorName: string;
  doctorId: string;
  clinicalNotes: string;
  treatmentUpdates: string;
  respiratoryStatus: 'normal' | 'mild_distress' | 'moderate_distress' | 'severe';
  temperatureAtConsultation?: number;
  temperatureWasPending: boolean;
  recommendDischargeReview: boolean;
}

export interface Patient {
  id: string; // e.g. "PT-1001"
  name: string;
  age: number;
  gender: 'female' | 'male' | 'other';
  admissionDate: string; // YYYY-MM-DD
  admissionTime: string; // HH:mm
  bedNumber: number; // 1 to 74
  ward: 'Ward A' | 'Ward B' | 'Ward C';
  status: PatientStatus;
  finalOutcome: FinalOutcome;
  outcomeDate?: string;
  outcomeRecordedBy?: string;
  outcomeNotes?: string;
  dischargeDate?: string;
  dischargeAuthorizedBy?: string;
  temperatureHistory: TemperatureReading[];
  doctorVisits: DoctorVisit[];
}

export interface Bed {
  bedNumber: number;
  ward: 'Ward A' | 'Ward B' | 'Ward C';
  isOccupied: boolean;
  occupiedByPatientId?: string;
  occupiedByPatientName?: string;
}

export interface FacilityMetrics {
  totalAdmittedActive: number;
  occupiedBeds: number;
  maxCapacity: number;
  pendingTempChecksToday: number;
  pendingDoctorVisitsToday: number;
  eligibleForDischargeCount: number;
  totalResolvedPatients: number;
  recoveredCount: number;
  deceasedCount: number;
  mortalityRate: number; // percentage 0 - 100
  recoveryRate: number; // percentage 0 - 100
  isHighMortalityAlert: boolean; // > 15%
}

export type ActiveTab = 
  | 'dashboard'
  | 'patients'
  | 'temperature'
  | 'doctor-visits'
  | 'discharge'
  | 'analytics'
  | 'about';
