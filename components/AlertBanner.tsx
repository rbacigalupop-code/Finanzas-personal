'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface Alert {
  id: number;
  type: 'warning' | 'critical' | 'info';
  message: string;
  is_read: number;
  triggered_at: string;
}

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch('/api/alerts?unread=true')
      .then((r) => r.json())
      .then(setAlerts);
  }, []);

  const dismiss = async (id: number) => {
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (!alerts.length) return null;

  const styleMap = {
    critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" /> },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" /> },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: <Info size={16} className="text-blue-500 shrink-0 mt-0.5" /> },
  };

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert) => {
        const s = styleMap[alert.type];
        return (
          <div key={alert.id} className={`flex items-start gap-2 p-3 rounded-xl border ${s.bg}`}>
            {s.icon}
            <p className={`text-sm flex-1 ${s.text}`}>{alert.message}</p>
            <button onClick={() => dismiss(alert.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
