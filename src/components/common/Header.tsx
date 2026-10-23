import React, { useState } from 'react';
import { useFacility } from '../../context/FacilityContext';
import { UserRole } from '../../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sliders,
  HelpCircle,
  Menu,
  Shield,
  Stethoscope,
  HeartPulse,
  Award,
} from 'lucide-react';

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const {
    activeRole,
    currentUser,
    facilityDate,
    feverThreshold,
    setActiveRole,
    setFacilityDate,
    setFeverThreshold,
    resetDemoData,
    setAssessmentGuideOpen,
    setAboutModalOpen,
  } = useFacility();

  const [showThresholdDropdown, setShowThresholdDropdown] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Date increment / decrement helper
  const adjustDate = (days: number) => {
    const d = new Date(facilityDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setFacilityDate(`${yyyy}-${mm}-${dd}`);
  };

  const roles: { id: UserRole; label: string; icon: React.ElementType; persona: string }[] = [
    { id: 'nurse', label: 'Nurse', icon: HeartPulse, persona: 'Nurse Elena Rostova, RN' },
    { id: 'doctor', label: 'Doctor', icon: Stethoscope, persona: 'Dr. Marcus Vance, MD' },
    { id: 'admin', label: 'Administrator', icon: Shield, persona: 'Sarah Chen, Operations Director' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top Banner / Role Switcher Strip */}
      <div className="bg-slate-900 text-slate-100 px-4 py-2 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Role switcher disclaimer & controls */}
          <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
            <span className="text-slate-400 font-medium tracking-wide">
              Prototype Role Switcher (Not production authentication):
            </span>
            <div className="inline-flex rounded-md p-0.5 bg-slate-800 border border-slate-700">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = activeRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRole(r.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="hidden lg:inline text-slate-400 font-mono">
              Signed in: <strong className="text-slate-200 font-sans">{currentUser.name}</strong> ({currentUser.title})
            </span>
          </div>

          {/* Quick assessment guidance & reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAssessmentGuideOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-medium transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              <span>10-Step Test Workflow</span>
            </button>
            <button
              onClick={() => setAboutModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors"
              title="View clinical assumptions & prototype notes"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Assumptions</span>
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 font-medium transition-colors"
              title="Reset sample data to initial state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              CareTrack
            </span>
            <span className="hidden sm:inline text-xs text-slate-500">
              Quarantine & Treatment Facility
            </span>
          </div>
        </div>

        {/* Facility Context Controls: Date & Fever Threshold */}
        <div className="flex items-center gap-3">
          {/* Facility-Local Date Selector */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
            <div className="flex items-center gap-1.5 px-2 text-slate-600 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Facility Date:</span>
            </div>
            <button
              onClick={() => adjustDate(-1)}
              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="date"
              value={facilityDate}
              onChange={(e) => e.target.value && setFacilityDate(e.target.value)}
              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => adjustDate(1)}
              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Configurable Fever Threshold */}
          <div className="relative">
            <button
              onClick={() => setShowThresholdDropdown(!showThresholdDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              title="Configurable fever threshold prototype setting"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Fever Cutoff:</span>
              <span className="font-mono font-semibold text-rose-600">≥{feverThreshold.toFixed(1)}°C</span>
            </button>

            {showThresholdDropdown && (
              <div className="absolute right-0 mt-2 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-50 text-xs">
                <div className="font-semibold text-slate-900 mb-1">
                  Configurable Fever Threshold
                </div>
                <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
                  Prototype assumption: 38.0°C is used as a demonstration criteria, not an established clinical rule.
                </p>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-slate-600">Threshold:</span>
                  <span className="font-mono font-bold text-slate-900">{feverThreshold.toFixed(1)}°C</span>
                </div>
                <input
                  type="range"
                  min="37.0"
                  max="39.0"
                  step="0.1"
                  value={feverThreshold}
                  onChange={(e) => setFeverThreshold(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>37.0°C</span>
                  <span>38.0°C (Default)</span>
                  <span>39.0°C</span>
                </div>
                <button
                  onClick={() => setShowThresholdDropdown(false)}
                  className="mt-3 w-full py-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Reset Demo Data to Initial State?
            </h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              This will restore the 15 seed patients, clear all test entries, and reset the facility date to <strong>2026-10-23</strong>.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDemoData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
