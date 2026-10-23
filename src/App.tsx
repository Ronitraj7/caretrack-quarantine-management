/**
 * CareTrack - Virus Quarantine and Treatment Facility Management
 * Technical Product Manager Assessment Prototype
 */

import React, { useState } from 'react';
import { FacilityProvider, useFacility } from './context/FacilityContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { NotificationToast } from './components/common/NotificationToast';
import { AssessmentGuideModal } from './components/common/AssessmentGuideModal';
import { AboutModal } from './components/common/AboutModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { PatientListView } from './components/patients/PatientListView';
import { TemperatureTrackingView } from './components/temperature/TemperatureTrackingView';
import { DoctorVisitsView } from './components/doctor/DoctorVisitsView';
import { DischargeManagementView } from './components/discharge/DischargeManagementView';
import { AnalyticsView } from './components/analytics/AnalyticsView';

const MainLayout: React.FC = () => {
  const { activeTab } = useFacility();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Header with Role Switcher & Controls */}
      <Header onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)} />

      {/* Main Workspace: Sidebar + Dynamic Content View */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'patients' && <PatientListView />}
          {activeTab === 'temperature' && <TemperatureTrackingView />}
          {activeTab === 'doctor-visits' && <DoctorVisitsView />}
          {activeTab === 'discharge' && <DischargeManagementView />}
          {activeTab === 'analytics' && <AnalyticsView />}
        </main>
      </div>

      {/* Persistent Global Modals and Notifications */}
      <NotificationToast />
      <AssessmentGuideModal />
      <AboutModal />
    </div>
  );
};

export default function App() {
  return (
    <FacilityProvider>
      <MainLayout />
    </FacilityProvider>
  );
}
