/**
 * CareTrack - Centralized Facility Service Layer
 * Coordinates frontend business logic, validation, and API interactions.
 * Components use this service rather than making raw HTTP requests directly.
 */

import * as api from './apiClient';
import {
  Patient,
  TemperatureReading,
  DoctorVisit,
  DischargeEvent,
  OutcomeEvent,
  ActivityLog,
  UserRole,
  UserProfile,
  FacilityMetrics,
  FacilityConfig,
} from '../types';
import {
  MAX_FACILITY_CAPACITY,
  DEFAULT_FEVER_THRESHOLD,
  evaluateDischargeEligibility,
  calculateFacilityMetrics,
  validateTemperatureInput,
} from '../utils/calculations';

export interface ServiceResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Service class implementing all business workflows
 */
export class FacilityService {
  /**
   * Check connection health with the JSON Server backend
   */
  static async checkBackendHealth(): Promise<{ online: boolean; message: string }> {
    return api.checkApiHealth();
  }

  /**
   * Load all patients from API
   */
  static async loadPatients(): Promise<Patient[]> {
    return api.getPatients();
  }

  /**
   * Load facility configuration from API
   */
  static async loadFacilityConfig(): Promise<FacilityConfig | null> {
    try {
      return await api.getFacilityConfig();
    } catch {
      return null;
    }
  }

  /**
   * Load activity history logs from API
   */
  static async loadActivityLogs(): Promise<ActivityLog[]> {
    try {
      return await api.getActivityLogs();
    } catch {
      return [];
    }
  }

  /**
   * Load discharge history from API
   */
  static async loadDischarges(): Promise<DischargeEvent[]> {
    try {
      return await api.getDischarges();
    } catch {
      return [];
    }
  }

  /**
   * Load outcome history from API
   */
  static async loadOutcomes(): Promise<OutcomeEvent[]> {
    try {
      return await api.getOutcomes();
    } catch {
      return [];
    }
  }

  /**
   * Admit a new patient with full validation:
   * 1. 74-bed capacity ceiling
   * 2. Active bed collision check
   * 3. Unique Patient ID check
   * 4. Required fields validation
   */
  static async admitPatient(
    patientData: {
      id: string;
      name: string;
      age: number;
      gender: 'female' | 'male' | 'other';
      admissionDate: string;
      admissionTime: string;
      bedNumber: number;
      ward: 'Ward A' | 'Ward B' | 'Ward C';
    },
    currentPatients: Patient[],
    currentUser: UserProfile
  ): Promise<ServiceResult<Patient>> {
    // 1. Role permission
    if (currentUser.role !== 'admin') {
      return {
        success: false,
        message: 'Permission Denied: Only Facility Administrators are authorized to admit patients and assign beds.',
      };
    }

    // 2. Validate required fields
    const cleanId = patientData.id.trim();
    const cleanName = patientData.name.trim();

    if (!cleanId) {
      return { success: false, message: 'Patient ID is required.' };
    }
    if (!cleanName) {
      return { success: false, message: 'Patient full name is required.' };
    }
    if (patientData.age <= 0 || isNaN(patientData.age)) {
      return { success: false, message: 'Please provide a valid patient age greater than 0.' };
    }
    if (patientData.bedNumber < 1 || patientData.bedNumber > MAX_FACILITY_CAPACITY) {
      return {
        success: false,
        message: `Invalid bed number. The facility has 74 beds (1 to ${MAX_FACILITY_CAPACITY}).`,
      };
    }

    // 3. Unique Patient ID
    const duplicateId = currentPatients.some(
      (p) => p.id.toUpperCase() === cleanId.toUpperCase()
    );
    if (duplicateId) {
      return {
        success: false,
        message: `Validation Error: Patient ID "${cleanId}" already exists. Each patient identifier must be unique.`,
      };
    }

    // 4. Maximum capacity limit
    const activePatients = currentPatients.filter((p) => p.status === 'active');
    if (activePatients.length >= MAX_FACILITY_CAPACITY) {
      return {
        success: false,
        message: `Capacity Reached: Facility is at maximum capacity (74/74 beds). Cannot admit new patients until a bed is released via discharge.`,
      };
    }

    // 5. Active bed collision
    const bedTaken = activePatients.find((p) => p.bedNumber === patientData.bedNumber);
    if (bedTaken) {
      return {
        success: false,
        message: `Bed Conflict: Bed #${patientData.bedNumber} is already occupied by active patient ${bedTaken.name} (${bedTaken.id}).`,
      };
    }

    const newPatient: Patient = {
      id: cleanId,
      name: cleanName,
      age: patientData.age,
      gender: patientData.gender,
      admissionDate: patientData.admissionDate,
      admissionTime: patientData.admissionTime,
      bedNumber: patientData.bedNumber,
      ward: patientData.ward,
      status: 'active',
      finalOutcome: 'active',
      temperatureHistory: [],
      doctorVisits: [],
      outcomeHistory: [],
    };

    try {
      // Create patient in JSON Server
      const created = await api.createPatient(newPatient);

      // Log activity
      const logEntry: ActivityLog = {
        id: `ACT-${Date.now()}`,
        type: 'admission',
        patientId: created.id,
        patientName: created.name,
        summary: `Admitted to ${created.ward}, Bed #${created.bedNumber}`,
        details: `Age: ${created.age}, Gender: ${created.gender}, Date: ${created.admissionDate} ${created.admissionTime}`,
        timestamp: Date.now(),
        date: created.admissionDate,
        time: created.admissionTime,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      };
      await api.createActivityLog(logEntry).catch(() => {});

      return {
        success: true,
        message: `Patient ${created.name} (${created.id}) successfully admitted to Bed #${created.bedNumber}.`,
        data: created,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save patient to API.';
      return {
        success: false,
        message: `API Error: ${errorMsg}`,
      };
    }
  }

  /**
   * Record a patient temperature reading
   */
  static async recordTemperature(
    patientId: string,
    celsiusInput: number | string,
    notes: string,
    isRepeat: boolean,
    currentPatient: Patient,
    facilityDate: string,
    feverThreshold: number,
    currentUser: UserProfile
  ): Promise<ServiceResult<TemperatureReading>> {
    // 1. Role permission
    if (currentUser.role !== 'nurse' && currentUser.role !== 'admin') {
      return {
        success: false,
        message: 'Permission Denied: Only Nurses (or Administrators) are authorized to record temperature checks.',
      };
    }

    if (currentPatient.status !== 'active') {
      return {
        success: false,
        message: 'Cannot record vitals for a patient who has been discharged.',
      };
    }

    // 2. Validate temperature
    const validation = validateTemperatureInput(celsiusInput);
    if (!validation.isValid || validation.numValue === null) {
      return {
        success: false,
        message: validation.errorMessage || 'Invalid temperature entry.',
      };
    }

    const celsius = validation.numValue;
    const isFever = celsius >= feverThreshold;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const readingId = `TR-${patientId}-${Date.now().toString().slice(-6)}`;

    const newReading: TemperatureReading = {
      id: readingId,
      patientId,
      date: facilityDate,
      time: timeStr,
      timestamp: Date.now(),
      celsius,
      isFever,
      recordedBy: currentUser.name,
      recordedByRole: currentUser.role,
      notes: notes.trim() || undefined,
      isRepeatMeasurement: isRepeat,
    };

    const updatedHistory = [...(currentPatient.temperatureHistory || []), newReading];

    // Clinical safety override: If fever is recorded and patient had doctor clearance, revoke clearance
    const shouldRevokeClearance = isFever && currentPatient.doctorClearance?.isCleared;
    const updatedClearance = shouldRevokeClearance ? undefined : currentPatient.doctorClearance;

    try {
      // 1. Save to dedicated temperatureReadings collection
      await api.createTemperatureReading(newReading);

      // 2. Update patient object
      await api.updatePatient(patientId, {
        temperatureHistory: updatedHistory,
        doctorClearance: updatedClearance,
      });

      // 3. Log activity
      const logEntry: ActivityLog = {
        id: `ACT-${Date.now()}`,
        type: 'temperature',
        patientId,
        patientName: currentPatient.name,
        summary: `Temperature recorded: ${celsius.toFixed(1)}°C (${isFever ? 'FEVER' : 'Afebrile'})${isRepeat ? ' [Repeat]' : ''}`,
        details: notes.trim() || (shouldRevokeClearance ? 'Active fever spike revoked doctor medical clearance.' : undefined),
        timestamp: Date.now(),
        date: facilityDate,
        time: timeStr,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      };
      await api.createActivityLog(logEntry).catch(() => {});

      let alertNote = '';
      if (shouldRevokeClearance) {
        alertNote = ' Notice: Active fever detected; prior Doctor Medical Clearance was automatically revoked for clinical safety.';
      }

      return {
        success: true,
        message: `Temperature ${celsius.toFixed(1)}°C successfully logged for ${currentPatient.name}.${alertNote}`,
        data: newReading,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save temperature reading.';
      return {
        success: false,
        message: `API Error: ${errorMsg}`,
      };
    }
  }

  /**
   * Record a doctor consultation
   */
  static async recordDoctorVisit(
    patientId: string,
    visitData: {
      clinicalNotes: string;
      treatmentUpdates: string;
      respiratoryStatus: 'normal' | 'mild_distress' | 'moderate_distress' | 'severe';
      recommendDischargeReview: boolean;
    },
    currentPatient: Patient,
    facilityDate: string,
    currentUser: UserProfile
  ): Promise<ServiceResult<DoctorVisit>> {
    // 1. Role permission
    if (currentUser.role !== 'doctor') {
      return {
        success: false,
        message: 'Permission Denied: Only Attending Doctors are authorized to record clinical consultations and treatment plans.',
      };
    }

    if (!visitData.clinicalNotes.trim()) {
      return {
        success: false,
        message: 'Clinical notes are required to document the patient round.',
      };
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const visitId = `DV-${patientId}-${Date.now().toString().slice(-6)}`;

    // Get today's temperature if available
    const todaysTemps = (currentPatient.temperatureHistory || []).filter((t) => t.date === facilityDate);
    const latestToday = todaysTemps.length > 0 ? todaysTemps[todaysTemps.length - 1] : null;

    const newVisit: DoctorVisit = {
      id: visitId,
      patientId,
      date: facilityDate,
      time: timeStr,
      timestamp: Date.now(),
      doctorName: currentUser.name,
      doctorId: currentUser.id,
      clinicalNotes: visitData.clinicalNotes.trim(),
      treatmentUpdates: visitData.treatmentUpdates.trim(),
      respiratoryStatus: visitData.respiratoryStatus,
      temperatureAtConsultation: latestToday ? latestToday.celsius : undefined,
      temperatureWasPending: !latestToday,
      recommendDischargeReview: visitData.recommendDischargeReview,
    };

    const updatedVisits = [...(currentPatient.doctorVisits || []), newVisit];

    try {
      // 1. Save to dedicated consultations collection
      await api.createConsultation(newVisit);

      // 2. Update patient object
      await api.updatePatient(patientId, {
        doctorVisits: updatedVisits,
      });

      // 3. Log activity
      const logEntry: ActivityLog = {
        id: `ACT-${Date.now()}`,
        type: 'consultation',
        patientId,
        patientName: currentPatient.name,
        summary: `Doctor Consultation Completed: Respiratory ${newVisit.respiratoryStatus}`,
        details: newVisit.clinicalNotes,
        timestamp: Date.now(),
        date: facilityDate,
        time: timeStr,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      };
      await api.createActivityLog(logEntry).catch(() => {});

      return {
        success: true,
        message: `Consultation saved for ${currentPatient.name}.`,
        data: newVisit,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save consultation.';
      return {
        success: false,
        message: `API Error: ${errorMsg}`,
      };
    }
  }

  /**
   * Grant Attending Doctor Medical Clearance (Stage 2)
   */
  static async grantDoctorClearance(
    patientId: string,
    justification: string,
    currentPatient: Patient,
    facilityDate: string,
    feverThreshold: number,
    currentUser: UserProfile
  ): Promise<ServiceResult> {
    // 1. Role permission
    if (currentUser.role !== 'doctor') {
      return {
        success: false,
        message: 'Permission Denied: Only Attending Doctors can issue medical discharge clearance.',
      };
    }

    if (currentPatient.status !== 'active') {
      return {
        success: false,
        message: 'Cannot issue clearance to an already discharged patient.',
      };
    }

    // 2. Clinical criteria verification (Stage 1 check)
    const eligibility = evaluateDischargeEligibility(currentPatient, facilityDate, feverThreshold);
    if (!eligibility.isEligible) {
      return {
        success: false,
        message: `Clearance Blocked: Patient has not completed 3 consecutive fever-free calendar days (${eligibility.summary}).`,
      };
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const clearance = {
      isCleared: true,
      clearedDate: facilityDate,
      clearedTime: timeStr,
      doctorName: currentUser.name,
      doctorId: currentUser.id,
      clinicalJustification: justification.trim() || 'Verified 3 consecutive fever-free calendar days and normal respiratory presentation.',
    };

    try {
      await api.updatePatient(patientId, { doctorClearance: clearance });

      const logEntry: ActivityLog = {
        id: `ACT-${Date.now()}`,
        type: 'clearance',
        patientId,
        patientName: currentPatient.name,
        summary: 'Attending Doctor Medical Clearance Granted (Stage 2 Complete)',
        details: clearance.clinicalJustification,
        timestamp: Date.now(),
        date: facilityDate,
        time: timeStr,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      };
      await api.createActivityLog(logEntry).catch(() => {});

      return {
        success: true,
        message: `Doctor Medical Clearance granted for ${currentPatient.name}. Patient is ready for Stage 3 Administrative Discharge.`,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update clearance on API.';
      return {
        success: false,
        message: `API Error: ${errorMsg}`,
      };
    }
  }

  /**
   * Revoke Doctor Medical Clearance
   */
  static async revokeDoctorClearance(
    patientId: string,
    reason: string,
    currentPatient: Patient,
    facilityDate: string,
    currentUser: UserProfile
  ): Promise<ServiceResult> {
    if (currentUser.role !== 'doctor' && currentUser.role !== 'admin') {
      return {
        success: false,
        message: 'Permission Denied: Only Doctors or Administrators can revoke medical clearance.',
      };
    }

    try {
      await api.updatePatient(patientId, { doctorClearance: undefined });

      const logEntry: ActivityLog = {
        id: `ACT-${Date.now()}`,
        type: 'clearance',
        patientId,
        patientName: currentPatient.name,
        summary: 'Doctor Medical Clearance Revoked',
        details: reason || 'Revoked by clinical supervisor.',
        timestamp: Date.now(),
        date: facilityDate,
        time: '12:00',
        actorName: currentUser.name,
        actorRole: currentUser.role,
      };
      await api.createActivityLog(logEntry).catch(() => {});

      return {
        success: true,
        message: `Medical clearance revoked for ${currentPatient.name}.`,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke clearance on API.';
      return {
        success: false,
        message: `API Error: ${errorMsg}`,
      };
    }
  }

  /**
   * Authorize & Complete Final Administrative Discharge (Stage 3)
   * Releases bed into inventory and updates patient status.
   */
  static async completeAdminDischarge(
    patientId: string,
    notes: string,
    currentPatient: Patient,
    facilityDate: string,
    feverThreshold: number,
    currentUser: UserProfile
  ): Promise<ServiceResult<DischargeEvent>> {
    // 1. Role permission: Strictly Admin
    if (currentUser.role !== 'admin') {
      return {
        success: false,
        message: 'Permission Denied: Only Facility Administrators are authorized to complete administrative discharge and release beds.',
      };
    }

    if (currentPatient.status !== 'active') {
      return {
        success: false,
        message: 'Patient is already discharged. Completed discharges cannot be modified.',
      };
    }

    // 2. Verify clinical criteria
    const eligibility = evaluateDischargeEligibility(currentPatient, facilityDate, feverThreshold);
    if (!eligibility.isEligible) {
      return {
        success: false,
        message: `Discharge Rejected: Patient does not meet the 3-day consecutive fever-free criteria (${eligibility.summary}).`,
      };
    }

    // 3. Verify prior doctor clearance
    if (!currentPatient.doctorClearance?.isCleared) {
      return {
        success: false,
        message: 'Discharge Rejected: Attending Doctor Medical Clearance (Stage 2) is required before Administrator discharge authorization.',
      };
    }

    const freedBedNumber = currentPatient.bedNumber;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dischargeId = `DIS-${patientId}-${Date.now().toString().slice(-6)}`;

    const dischargeRecord: DischargeEvent = {
      id: dischargeId,
      patientId,
      patientName: currentPatient.name,
      date: facilityDate,
      time: timeStr,
      authorizedBy: currentUser.name,
      authorizedRole: currentUser.role,
      bedFreed: freedBedNumber,
      notes: notes.trim() || undefined,
    };

    try {
      // 1. Save to discharges collection
      await api.createDischarge(dischargeRecord);

      // 2. Update patient record
      await api.updatePatient(patientId, {
        status: 'discharged',
        dischargeDate: facilityDate,
        dischargeAuthorizedBy: currentUser.name,
      });

      // 3. Log activity
      const logEntry: ActivityLog = {
        id: `ACT-${Date.now()}`,
        type: 'discharge',
        patientId,
        patientName: currentPatient.name,
        summary: `Administrative Discharge Complete · Bed #${freedBedNumber} Released`,
        details: notes.trim() || 'Discharged following 3-day afebrile criteria and medical clearance.',
        timestamp: Date.now(),
        date: facilityDate,
        time: timeStr,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      };
      await api.createActivityLog(logEntry).catch(() => {});

      return {
        success: true,
        message: `Discharge finalized for ${currentPatient.name}. Bed #${freedBedNumber} (${currentPatient.ward}) is now released and available for new admissions.`,
        data: dischargeRecord,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to finalize discharge on API.';
      return {
        success: false,
        message: `API Error: ${errorMsg}`,
      };
    }
  }

  /**
   * Record or Amend a Final Patient Clinical Outcome (Recovered / Deceased)
   * Never silently overwrites; preserves outcome history audit trail.
   */
  static async recordFinalOutcome(
    patientId: string,
    outcome: 'recovered' | 'deceased',
    notes: string,
    currentPatient: Patient,
    facilityDate: string,
    currentUser: UserProfile
  ): Promise<ServiceResult<OutcomeEvent>> {
    // 1. Role permission: Admin only
    if (currentUser.role !== 'admin') {
      return {
        success: false,
        message: 'Permission Denied: Only Facility Administrators are authorized to certify and record final patient outcomes.',
      };
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const outcomeId = `OUT-${patientId}-${Date.now().toString().slice(-6)}`;

    const outcomeEvent: OutcomeEvent = {
      id: outcomeId,
      patientId,
      patientName: currentPatient.name,
      outcome,
      date: facilityDate,
      time: timeStr,
      recordedBy: currentUser.name,
      recordedByRole: currentUser.role,
      notes: notes.trim() || undefined,
    };

    const newAuditEntry = {
      outcome,
      date: facilityDate,
      recordedBy: `${currentUser.name} (${currentUser.role})`,
      notes: notes.trim() || undefined,
      timestamp: Date.now(),
    };

    const updatedHistory = [...(currentPatient.outcomeHistory || []), newAuditEntry];

    try {
      // 1. Save to outcomes collection
      await api.createOutcome(outcomeEvent);

      // 2. Update patient record
      await api.updatePatient(patientId, {
        finalOutcome: outcome,
        outcomeDate: facilityDate,
        outcomeRecordedBy: currentUser.name,
        outcomeNotes: notes.trim() || undefined,
        outcomeHistory: updatedHistory,
      });

      // 3. Log activity
      const logEntry: ActivityLog = {
        id: `ACT-${Date.now()}`,
        type: 'outcome',
        patientId,
        patientName: currentPatient.name,
        summary: `Outcome Certified: ${outcome.toUpperCase()}`,
        details: notes.trim() || undefined,
        timestamp: Date.now(),
        date: facilityDate,
        time: timeStr,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      };
      await api.createActivityLog(logEntry).catch(() => {});

      return {
        success: true,
        message: `Final outcome "${outcome.toUpperCase()}" recorded for ${currentPatient.name}. Mortality and recovery analytics updated.`,
        data: outcomeEvent,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save outcome to API.';
      return {
        success: false,
        message: `API Error: ${errorMsg}`,
      };
    }
  }
}
