'use client';

import { useState } from 'react';
import { AlertTriangle, X, ChevronDown } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export default function DisclaimerBanner({ compact = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      <div className="flex items-start gap-2.5 p-3">
        <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-800">
            Herramienta de apoyo — no reemplaza asesoría contable
          </p>
          {(!compact || expanded) && (
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Esta aplicación es un auxiliar de orden financiero y tributario de carácter <strong>referencial</strong>.
              Los cálculos de IVA, PPM, retenciones y proyecciones son estimaciones basadas en los datos ingresados
              por el usuario. <strong>No constituyen asesoría legal ni contable</strong>. Los montos, fechas y
              obligaciones tributarias definitivas deben ser verificados con un <strong>contador certificado</strong> y
              con la información oficial del <strong>SII (sii.cl)</strong> antes de cualquier declaración o pago.
              El desarrollador no asume responsabilidad por omisiones o errores derivados del uso de esta app.
            </p>
          )}
          {compact && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-amber-600 font-medium mt-0.5"
            >
              {expanded ? 'Mostrar menos' : 'Ver aviso completo'}
              <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 shrink-0 p-0.5">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
