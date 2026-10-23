import React, { useState } from 'react';
import { useFacility } from '../../context/FacilityContext';
import {
  Award,
  CheckCircle,
  ArrowRight,
  UserPlus,
  Thermometer,
  Stethoscope,
  Calendar,
  LogOut,
  BedDouble,
  FileCheck,
  BarChart3,
  X,
  ExternalLink,
} from 'lucide-react';

export const AssessmentGuideModal: React.FC = () => {
  const {
    assessmentGuideOpen,
    setAssessmentGuideOpen,
    setActiveRole,
    setActiveTab,
    setPatientFilter,
    setSelectedPatientId,
  } = useFacility();

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  if (!assessmentGuideOpen) return null;

  const toggleStepCompleted = (stepNumber: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNumber) ? prev.filter((s) => s !== stepNumber) : [...prev, stepNumber]
    );
  };

  const steps = [
    {
      num: 1,
      title: 'Register a patient (Admin)',
      role: 'admin' as const,
      tab: 'patients' as const,
      icon: UserPlus,
      description: 'Switch to Administrator role, open "Patients & Beds", and click "+ Admit New Patient". Enter ID, fictional name, and pick an available bed.',
      actionText: 'Go to Patient Admission',
      handler: () => {
        setActiveRole('admin');
        setActiveTab('patients');
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 2,
      title: "Record patient's temperature (Nurse)",
      role: 'nurse' as const,
      tab: 'temperature' as const,
      icon: Thermometer,
      description: 'Switch to Nurse role, open "Temperature Checks", select a patient awaiting check today (e.g. Elena Santos or your newly registered patient), and record a reading.',
      actionText: 'Open Temperature Checks',
      handler: () => {
        setActiveRole('nurse');
        setActiveTab('temperature');
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 3,
      title: 'Open the Doctor queue',
      role: 'doctor' as const,
      tab: 'doctor-visits' as const,
      icon: Stethoscope,
      description: 'Switch to Doctor role, navigate to "Doctor Visits" to inspect the daily consultation queue. Note warning banners for patients whose temperature check is still pending.',
      actionText: 'Open Doctor Queue',
      handler: () => {
        setActiveRole('doctor');
        setActiveTab('doctor-visits');
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 4,
      title: 'Review temperature & record Doctor visit',
      role: 'doctor' as const,
      tab: 'doctor-visits' as const,
      icon: Stethoscope,
      description: 'Click "Start Consultation" on a patient (e.g. David Kim or Elena Santos), review their temperature timeline, enter clinical notes and treatment plan, then save consultation.',
      actionText: 'Go to Doctor Queue',
      handler: () => {
        setActiveRole('doctor');
        setActiveTab('doctor-visits');
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 5,
      title: 'Record subsequent daily temperature readings',
      role: 'nurse' as const,
      tab: 'temperature' as const,
      icon: Calendar,
      description: 'Use the facility date controls in the top bar to advance to tomorrow, or record multiple/repeat readings on the same day without overwriting previous logs.',
      actionText: 'Go to Temperature Checks',
      handler: () => {
        setActiveRole('nurse');
        setActiveTab('temperature');
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 6,
      title: 'Identify discharge eligibility after 3 fever-free days',
      role: 'doctor' as const,
      tab: 'discharge' as const,
      icon: CheckCircle,
      description: 'Inspect Arthur Pendelton (PT-1001) or Zoe Tanaka (PT-1002) in Discharge Management. Notice the exact 3 qualifying afebrile dates shown, and verify missing days reset the streak.',
      actionText: 'View Discharge Eligibility',
      handler: () => {
        setActiveRole('doctor');
        setActiveTab('discharge');
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 7,
      title: 'Record discharge as authorized user',
      role: 'admin' as const,
      tab: 'discharge' as const,
      icon: LogOut,
      description: 'As Administrator (or Doctor), click "Authorize & Complete Discharge" for eligible patient Arthur Pendelton. Notice that nurses are prevented from discharging.',
      actionText: 'Open Discharge Screen',
      handler: () => {
        setActiveRole('admin');
        setActiveTab('discharge');
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 8,
      title: 'Verify bed becomes available',
      role: 'admin' as const,
      tab: 'patients' as const,
      icon: BedDouble,
      description: 'Check the bed occupancy count in the sidebar and the Patients list. The discharged patient\'s bed (Bed #1) is immediately released and ready for reassignment.',
      actionText: 'Verify Beds in Patient List',
      handler: () => {
        setActiveRole('admin');
        setActiveTab('patients');
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 9,
      title: 'Record a final patient outcome (Recovered / Deceased)',
      role: 'admin' as const,
      tab: 'patients' as const,
      icon: FileCheck,
      description: 'Open any patient detail card (or discharge modal), and record their verified final outcome: "Recovered" or "Deceased".',
      actionText: 'Go to Patient Details',
      handler: () => {
        setActiveRole('admin');
        setActiveTab('patients');
        setSelectedPatientId('PT-1008'); // Samuel Thorne or other
        setAssessmentGuideOpen(false);
      },
    },
    {
      num: 10,
      title: 'Verify analytics update correctly',
      role: 'admin' as const,
      tab: 'analytics' as const,
      icon: BarChart3,
      description: 'Check the Analytics tab: verify mortality and recovery rates recalculate immediately with explicit numerators, denominators, and sample sizes, plus the >15% mortality alert.',
      actionText: 'View Analytics Dashboard',
      handler: () => {
        setActiveRole('admin');
        setActiveTab('analytics');
        setAssessmentGuideOpen(false);
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30 text-amber-300">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                TPM Assessment 10-Step Verification Workflow
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Interactive checklist verifying each required end-to-end capability in CareTrack.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAssessmentGuideOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Completed: <strong className="font-mono text-slate-900">{completedSteps.length} of 10</strong> steps
          </span>
          <div className="w-48 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(completedSteps.length / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="p-6 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {steps.map((step) => {
            const isDone = completedSteps.includes(step.num);
            const Icon = step.icon;

            return (
              <div
                key={step.num}
                className={`p-4 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleStepCompleted(step.num)}
                      className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-300 text-slate-500 hover:border-slate-400'
                      }`}
                      title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {isDone ? <CheckCircle className="w-4 h-4" /> : step.num}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {step.title}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono capitalize">
                          Role: {step.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={step.handler}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    <span>{step.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Clicking any step switches your role and navigates directly to that screen.
          </span>
          <button
            onClick={() => setAssessmentGuideOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
