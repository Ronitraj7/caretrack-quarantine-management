import React from 'react';
import { useFacility } from '../../context/FacilityContext';
import { ActiveTab } from '../../types';
import {
  LayoutDashboard,
  Users,
  Thermometer,
  Stethoscope,
  LogOut,
  BarChart3,
  HelpCircle,
  BedDouble,
  AlertTriangle,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    activeTab,
    setActiveTab,
    metrics,
    setPatientFilter,
    setAboutModalOpen,
  } = useFacility();

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badgeCount?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'patients',
      label: 'Patients & Beds',
      icon: Users,
      badgeCount: metrics.occupiedBeds,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'temperature',
      label: 'Temperature Checks',
      icon: Thermometer,
      badgeCount: metrics.pendingTempChecksToday,
      badgeColor: metrics.pendingTempChecksToday > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'doctor-visits',
      label: 'Doctor Visits',
      icon: Stethoscope,
      badgeCount: metrics.pendingDoctorVisitsToday,
      badgeColor: metrics.pendingDoctorVisitsToday > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600',
    },
    {
      id: 'discharge',
      label: 'Discharge Management',
      icon: LogOut,
      badgeCount: metrics.eligibleForDischargeCount,
      badgeColor: metrics.eligibleForDischargeCount > 0 ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600',
    },
    {
      id: 'analytics',
      label: 'Outcomes & Analytics',
      icon: BarChart3,
      badgeCount: metrics.isHighMortalityAlert ? undefined : undefined,
    },
  ];

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (tabId === 'patients') {
      // reset filters
      setPatientFilter({ status: 'all' });
    }
    onCloseMobile();
  };

  const occupancyPercent = Math.round((metrics.occupiedBeds / metrics.maxCapacity) * 100);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 md:top-[85px] z-50 md:z-10 h-screen md:h-[calc(100vh-85px)] w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation list */}
        <div className="p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Clinical Operations
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badgeCount !== undefined && (
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}

                {item.id === 'analytics' && metrics.isHighMortalityAlert && (
                  <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    &gt;15%
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-100">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Documentation
            </div>
            <button
              onClick={() => {
                setAboutModalOpen(true);
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Assumptions &amp; Notes</span>
            </button>
          </div>
        </div>

        {/* Bed Occupancy Card at bottom of sidebar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <div className="flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 text-slate-500" />
              <span>Facility Capacity</span>
            </div>
            <span className="font-mono text-slate-900">
              {metrics.occupiedBeds} / {metrics.maxCapacity}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-300 ${
                occupancyPercent > 90
                  ? 'bg-rose-500'
                  : occupancyPercent > 70
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, occupancyPercent)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500">
            <span>{occupancyPercent}% Occupied</span>
            <span className="font-mono font-medium text-slate-700">
              {metrics.maxCapacity - metrics.occupiedBeds} beds free
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
