/**
 * CareTrack - Business Rules and Calculation Utilities
 */

import { Patient, FacilityMetrics, TemperatureReading } from '../types';

export const MAX_FACILITY_CAPACITY = 74;
export const DEFAULT_FEVER_THRESHOLD = 38.0; // Celsius

export interface DischargeEligibilityResult {
  isEligible: boolean;
  consecutiveDays: number;
  qualifyingDays: Array<{
    date: string;
    readings: TemperatureReading[];
    maxTemp: number;
  }>;
  streakBreakReason?: string;
  summary: string;
}

/**
 * Determine which ward a bed belongs to (1 - 74)
 */
export function getWardForBed(bedNumber: number): 'Ward A' | 'Ward B' | 'Ward C' {
  if (bedNumber <= 25) return 'Ward A';
  if (bedNumber <= 50) return 'Ward B';
  return 'Ward C';
}

/**
 * Formats a temperature value safely to 1 decimal place
 */
export function formatTemp(celsius: number | undefined | null): string {
  if (celsius === undefined || celsius === null || isNaN(celsius)) return '--';
  return `${celsius.toFixed(1)}°C`;
}

/**
 * Validate entered temperature:
 * Must be numeric, between 30.0°C and 45.0°C
 */
export function validateTemperatureInput(value: string | number): {
  isValid: boolean;
  numValue: number | null;
  errorMessage?: string;
} {
  const str = String(value).trim();
  if (!str) {
    return { isValid: false, numValue: null, errorMessage: 'Temperature is required.' };
  }

  const num = parseFloat(str);
  if (isNaN(num)) {
    return { isValid: false, numValue: null, errorMessage: 'Temperature must be a valid numeric value.' };
  }

  if (num < 30.0 || num > 45.0) {
    return {
      isValid: false,
      numValue: num,
      errorMessage: `Value ${num.toFixed(1)}°C is outside plausible human physiological range (30.0°C - 45.0°C).`,
    };
  }

  return { isValid: true, numValue: Math.round(num * 10) / 10 };
}

/**
 * Given two dates 'YYYY-MM-DD', returns array of date strings between them inclusive
 */
export function getDateRangeInclusive(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  if (curr > end) {
    return [startDateStr];
  }

  while (curr <= end) {
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Calculate consecutive fever-free days for a patient relative to facilityDate.
 *
 * Requirements:
 * 1. Must have 3 full consecutive fever-free days.
 * 2. Missing measurements CANNOT count as fever-free days.
 * 3. Reset the consecutive fever-free count when a fever is recorded.
 * 4. Display the dates used in calculation.
 */
export function evaluateDischargeEligibility(
  patient: Patient,
  facilityDate: string,
  feverThreshold: number = DEFAULT_FEVER_THRESHOLD
): DischargeEligibilityResult {
  if (patient.status === 'discharged') {
    return {
      isEligible: false,
      consecutiveDays: 0,
      qualifyingDays: [],
      summary: 'Patient already discharged.',
    };
  }

  // Group patient's valid temperature readings by calendar date
  const readingsByDate = new Map<string, TemperatureReading[]>();
  for (const reading of patient.temperatureHistory) {
    const existing = readingsByDate.get(reading.date) || [];
    existing.push(reading);
    readingsByDate.set(reading.date, existing);
  }

  // Check the sequence of days up to facilityDate
  // A patient may have completed 3 days either ending today (if today's readings are complete & fever-free)
  // or ending yesterday.
  const admissionDate = patient.admissionDate;
  const evaluationDate = facilityDate;

  const dateList = getDateRangeInclusive(admissionDate, evaluationDate);

  // We scan day by day from admission to evaluationDate
  let currentStreak = 0;
  let currentStreakDays: Array<{
    date: string;
    readings: TemperatureReading[];
    maxTemp: number;
  }> = [];

  let lastBreakReason = '';

  for (const day of dateList) {
    const dayReadings = readingsByDate.get(day);

    if (!dayReadings || dayReadings.length === 0) {
      // Missing measurement: breaks streak, CANNOT count as fever-free
      if (day !== evaluationDate) {
        // Only breaks streak if it's a past calendar day. If it's today and today has no reading yet,
        // it doesn't add to streak, but past unbroken days may already have satisfied the 3 days!
        currentStreak = 0;
        currentStreakDays = [];
        lastBreakReason = `Missing temperature reading on ${day}`;
      }
      continue;
    }

    // Check if any reading on this day exceeded the fever threshold
    const maxTemp = Math.max(...dayReadings.map((r) => r.celsius));
    const hasFever = dayReadings.some((r) => r.celsius >= feverThreshold);

    if (hasFever) {
      // Fever recorded: resets streak to 0
      currentStreak = 0;
      currentStreakDays = [];
      lastBreakReason = `Fever recorded on ${day} (${maxTemp.toFixed(1)}°C >= ${feverThreshold.toFixed(1)}°C)`;
    } else {
      // Valid fever-free day!
      currentStreak += 1;
      currentStreakDays.push({
        date: day,
        readings: dayReadings,
        maxTemp,
      });
    }
  }

  const isEligible = currentStreak >= 3;
  // If eligible or has streak, get the qualifying days (last 3 if >= 3)
  const qualifyingDays = isEligible ? currentStreakDays.slice(-3) : currentStreakDays;

  let summary = '';
  if (isEligible) {
    summary = `Eligible for discharge: Completed ${currentStreak} consecutive fever-free days (${qualifyingDays.map(q => q.date).join(', ')}).`;
  } else if (currentStreak > 0) {
    summary = `${currentStreak} of 3 consecutive fever-free days recorded. Needs ${3 - currentStreak} more consecutive fever-free day(s).`;
  } else if (lastBreakReason) {
    summary = `Streak reset: ${lastBreakReason}.`;
  } else {
    summary = 'No consecutive fever-free streak yet.';
  }

  return {
    isEligible,
    consecutiveDays: currentStreak,
    qualifyingDays,
    streakBreakReason: lastBreakReason || undefined,
    summary,
  };
}

/**
 * Check if a patient has their daily temperature check completed on facilityDate
 */
export function isDailyTemperatureComplete(patient: Patient, facilityDate: string): boolean {
  return patient.temperatureHistory.some((r) => r.date === facilityDate);
}

/**
 * Get the latest temperature reading for a patient on a specific date (or overall latest)
 */
export function getLatestTemperature(patient: Patient, onDate?: string): TemperatureReading | null {
  const filtered = onDate
    ? patient.temperatureHistory.filter((r) => r.date === onDate)
    : patient.temperatureHistory;

  if (filtered.length === 0) return null;
  return [...filtered].sort((a, b) => b.timestamp - a.timestamp)[0];
}

/**
 * Check if a patient has had a completed doctor visit on facilityDate
 */
export function isDailyDoctorVisitComplete(patient: Patient, facilityDate: string): boolean {
  return patient.doctorVisits.some((v) => v.date === facilityDate);
}

/**
 * Calculate overall facility metrics
 */
export function calculateFacilityMetrics(
  patients: Patient[],
  facilityDate: string,
  feverThreshold: number = DEFAULT_FEVER_THRESHOLD
): FacilityMetrics {
  const activePatients = patients.filter((p) => p.status === 'active');
  const occupiedBeds = activePatients.length;

  const pendingTempChecksToday = activePatients.filter(
    (p) => !isDailyTemperatureComplete(p, facilityDate)
  ).length;

  const pendingDoctorVisitsToday = activePatients.filter(
    (p) => !isDailyDoctorVisitComplete(p, facilityDate)
  ).length;

  const eligibleForDischargeCount = activePatients.filter(
    (p) => evaluateDischargeEligibility(p, facilityDate, feverThreshold).isEligible
  ).length;

  // Final outcomes calculation:
  // Must use patients with recorded final outcomes.
  // Do NOT treat active patients or unknown outcomes as recovered!
  const resolvedPatients = patients.filter(
    (p) => p.finalOutcome === 'recovered' || p.finalOutcome === 'deceased'
  );

  const recoveredCount = patients.filter((p) => p.finalOutcome === 'recovered').length;
  const deceasedCount = patients.filter((p) => p.finalOutcome === 'deceased').length;
  const totalResolved = resolvedPatients.length;

  const mortalityRate = totalResolved > 0 ? (deceasedCount / totalResolved) * 100 : 0;
  const recoveryRate = totalResolved > 0 ? (recoveredCount / totalResolved) * 100 : 0;

  // Prominent warning when observed mortality rate exceeds 15%
  const isHighMortalityAlert = mortalityRate > 15 && totalResolved > 0;

  return {
    totalAdmittedActive: activePatients.length,
    occupiedBeds,
    maxCapacity: MAX_FACILITY_CAPACITY,
    pendingTempChecksToday,
    pendingDoctorVisitsToday,
    eligibleForDischargeCount,
    totalResolvedPatients: totalResolved,
    recoveredCount,
    deceasedCount,
    mortalityRate: Math.round(mortalityRate * 10) / 10,
    recoveryRate: Math.round(recoveryRate * 10) / 10,
    isHighMortalityAlert,
  };
}

/**
 * Check if a bed number is already occupied by an active patient
 */
export function isBedOccupied(
  bedNumber: number,
  patients: Patient[],
  excludePatientId?: string
): boolean {
  return patients.some(
    (p) => p.status === 'active' && p.bedNumber === bedNumber && p.id !== excludePatientId
  );
}

/**
 * Find first available bed number in the facility (1 to 74)
 */
export function findFirstAvailableBed(patients: Patient[]): number | null {
  const occupiedSet = new Set(
    patients.filter((p) => p.status === 'active').map((p) => p.bedNumber)
  );
  for (let bed = 1; bed <= MAX_FACILITY_CAPACITY; bed++) {
    if (!occupiedSet.has(bed)) {
      return bed;
    }
  }
  return null;
}
