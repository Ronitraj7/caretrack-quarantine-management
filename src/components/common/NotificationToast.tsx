import React from 'react';
import { useFacility } from '../../context/FacilityContext';
import { CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notification, clearNotification } = useFacility();

  if (!notification) return null;

  const bgStyles = {
    success: 'bg-emerald-900/90 text-white border-emerald-700 shadow-emerald-950/20',
    error: 'bg-rose-900/90 text-white border-rose-700 shadow-rose-950/20',
    info: 'bg-slate-900/90 text-white border-slate-700 shadow-slate-950/20',
  }[notification.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: AlertTriangle,
  }[notification.type];

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-md ${bgStyles}`}>
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm font-medium leading-snug">
          {notification.message}
        </div>
        <button
          onClick={clearNotification}
          className="text-white/70 hover:text-white p-1 rounded transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
