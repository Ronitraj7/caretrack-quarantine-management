/**
 * CareTrack - Centralized REST API Client
 * Interfaces with JSON Server backend (http://localhost:3001) or configured VITE_API_URL
 */

import {
  Patient,
  TemperatureReading,
  DoctorVisit,
  DischargeEvent,
  OutcomeEvent,
  ActivityLog,
  FacilityConfig,
} from '../types';

// Read API base URL from Vite environment variable with fallback to local development port 3001
const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Custom Error class with HTTP status code
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Generic fetch wrapper with timeout, JSON parsing, and unified error messages
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson && (errorJson.message || errorJson.error)) {
          errorDetail = errorJson.message || errorJson.error;
        }
      } catch {
        // use fallback error detail
      }
      throw new ApiError(errorDetail, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new ApiError(`Request timeout after ${timeoutMs}ms while contacting ${url}`, 408);
      }
      throw new ApiError(`Network error connecting to API (${API_BASE_URL}): ${err.message}`, 0);
    }
    throw new ApiError('An unexpected network error occurred.', 500);
  }
}

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------
export async function checkApiHealth(): Promise<{ online: boolean; message: string }> {
  try {
    // Attempt pinging /facilityConfig or /patients with a short timeout
    await request<unknown>('/facilityConfig', { method: 'GET' }, 2500);
    return { online: true, message: `Connected to JSON Server at ${API_BASE_URL}` };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      online: false,
      message: `JSON Server unreachable at ${API_BASE_URL}: ${errorMsg}`,
    };
  }
}

// -------------------------------------------------------------
// Patients Collection API (/patients)
// -------------------------------------------------------------
export async function getPatients(): Promise<Patient[]> {
  return request<Patient[]>('/patients?_sort=admissionDate&_order=desc');
}

export async function getPatientById(id: string): Promise<Patient> {
  return request<Patient>(`/patients/${encodeURIComponent(id)}`);
}

export async function createPatient(patient: Patient): Promise<Patient> {
  return request<Patient>('/patients', {
    method: 'POST',
    body: JSON.stringify(patient),
  });
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
  return request<Patient>(`/patients/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deletePatient(id: string): Promise<void> {
  return request<void>(`/patients/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// -------------------------------------------------------------
// Temperature Readings Collection API (/temperatureReadings)
// -------------------------------------------------------------
export async function getTemperatureReadings(patientId?: string): Promise<TemperatureReading[]> {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
  return request<TemperatureReading[]>(`/temperatureReadings${query}`);
}

export async function createTemperatureReading(
  reading: TemperatureReading
): Promise<TemperatureReading> {
  return request<TemperatureReading>('/temperatureReadings', {
    method: 'POST',
    body: JSON.stringify(reading),
  });
}

// -------------------------------------------------------------
// Consultations Collection API (/consultations)
// -------------------------------------------------------------
export async function getConsultations(patientId?: string): Promise<DoctorVisit[]> {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
  return request<DoctorVisit[]>(`/consultations${query}`);
}

export async function createConsultation(consultation: DoctorVisit): Promise<DoctorVisit> {
  return request<DoctorVisit>('/consultations', {
    method: 'POST',
    body: JSON.stringify(consultation),
  });
}

// -------------------------------------------------------------
// Discharges Collection API (/discharges)
// -------------------------------------------------------------
export async function getDischarges(): Promise<DischargeEvent[]> {
  return request<DischargeEvent[]>('/discharges?_sort=date&_order=desc');
}

export async function createDischarge(discharge: DischargeEvent): Promise<DischargeEvent> {
  return request<DischargeEvent>('/discharges', {
    method: 'POST',
    body: JSON.stringify(discharge),
  });
}

// -------------------------------------------------------------
// Outcomes Collection API (/outcomes)
// -------------------------------------------------------------
export async function getOutcomes(): Promise<OutcomeEvent[]> {
  return request<OutcomeEvent[]>('/outcomes?_sort=date&_order=desc');
}

export async function createOutcome(outcome: OutcomeEvent): Promise<OutcomeEvent> {
  return request<OutcomeEvent>('/outcomes', {
    method: 'POST',
    body: JSON.stringify(outcome),
  });
}

// -------------------------------------------------------------
// Activity Logs Collection API (/activityLogs)
// -------------------------------------------------------------
export async function getActivityLogs(): Promise<ActivityLog[]> {
  return request<ActivityLog[]>('/activityLogs?_sort=timestamp&_order=desc&_limit=50');
}

export async function createActivityLog(log: ActivityLog): Promise<ActivityLog> {
  return request<ActivityLog>('/activityLogs', {
    method: 'POST',
    body: JSON.stringify(log),
  });
}

// -------------------------------------------------------------
// Facility Config Collection API (/facilityConfig)
// -------------------------------------------------------------
export async function getFacilityConfig(): Promise<FacilityConfig> {
  return request<FacilityConfig>('/facilityConfig');
}

export async function updateFacilityConfig(
  updates: Partial<FacilityConfig>
): Promise<FacilityConfig> {
  return request<FacilityConfig>('/facilityConfig', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}
