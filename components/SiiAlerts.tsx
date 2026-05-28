'use client';

import { AlertCircle, CheckCircle2, Clock, CalendarDays, ExternalLink } from 'lucide-react';

// ── Chilean public holidays (fixed dates) ──────────────────────────────────
const FIXED_HOLIDAYS: Array<{ month: number; day: number }> = [
  { month: 1,  day: 1  }, // Año Nuevo
  { month: 5,  day: 1  }, // Día del Trabajo
  { month: 5,  day: 21 }, // Glorias Navales
  { month: 6,  day: 29 }, // San Pedro y San Pablo
  { month: 7,  day: 16 }, // Virgen del Carmen
  { month: 8,  day: 15 }, // Asunción de la Virgen
  { month: 9,  day: 18 }, // Independencia Nacional
  { month: 9,  day: 19 }, // Glorias del Ejército
  { month: 10, day: 12 }, // Encuentro de Dos Mundos
  { month: 10, day: 31 }, // Día Iglesias Evangélicas
  { month: 11, day: 1  }, // Día de Todos los Santos
  { month: 12, day: 8  }, // Inmaculada Concepción
  { month: 12, day: 25 }, // Navidad
];

function isHoliday(date: Date): boolean {
  return FIXED_HOLIDAYS.some(
    (h) => h.month === date.getMonth() + 1 && h.day === date.getDate()
  );
}

/** Returns the actual SII F29 due date for a given tax period (year/month).
 *  Base is the 12th of the following month; shifts forward past weekends & holidays. */
export function getF29DueDate(taxYear: number, taxMonth: number): Date {
  // Due in the FOLLOWING month
  let dueMonth = taxMonth + 1;
  let dueYear  = taxYear;
  if (dueMonth > 12) { dueMonth = 1; dueYear++; }

  let due = new Date(dueYear, dueMonth - 1, 12);
  // Advance past weekends and holidays
  while (due.getDay() === 0 || due.getDay() === 6 || isHoliday(due)) {
    due.setDate(due.getDate() + 1);
  }
  return due;
}

/** Returns days until (positive) or days since (negative) a date */
function daysFromNow(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

interface DeadlineRow {
  label: string;
  due: Date;
  period: string;
  days: number;
}

export default function SiiAlerts() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  // Build upcoming F29 deadlines: current month's taxes (due next month) + last month
  const deadlines: DeadlineRow[] = [];

  // Previous month's F29 (might still be unpaid)
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevDue   = getF29DueDate(prevYear, prevMonth);
  const prevDays  = daysFromNow(prevDue);
  deadlines.push({
    label:  `F29 ${MONTH_NAMES[prevMonth - 1]} ${prevYear}`,
    due:    prevDue,
    period: `Período: ${MONTH_NAMES[prevMonth - 1]} ${prevYear}`,
    days:   prevDays,
  });

  // Current month's F29 (due next month)
  const currDue  = getF29DueDate(year, month);
  const currDays = daysFromNow(currDue);
  deadlines.push({
    label:  `F29 ${MONTH_NAMES[month - 1]} ${year}`,
    due:    currDue,
    period: `Período: ${MONTH_NAMES[month - 1]} ${year}`,
    days:   currDays,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <CalendarDays size={14} className="text-orange-500" />
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Vencimientos SII — F29
        </p>
        <a
          href="https://www.sii.cl/valores_y_fechas/formulario_29/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-[10px] text-blue-500 font-medium"
        >
          SII oficial <ExternalLink size={10} />
        </a>
      </div>

      {deadlines.map((d) => {
        const isPast    = d.days < 0;
        const isUrgent  = d.days >= 0 && d.days <= 5;
        const isOk      = d.days > 5;

        const bg      = isPast ? 'bg-red-50 border-red-200'       : isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-100';
        const textClr = isPast ? 'text-red-700'                   : isUrgent ? 'text-orange-700'               : 'text-green-700';
        const Icon    = isPast ? AlertCircle                       : isUrgent ? Clock                           : CheckCircle2;
        const iconClr = isPast ? 'text-red-500'                   : isUrgent ? 'text-orange-500'               : 'text-green-500';
        const badge   = isPast
          ? `Venció hace ${Math.abs(d.days)} día${Math.abs(d.days) !== 1 ? 's' : ''}`
          : d.days === 0
          ? '¡Vence HOY!'
          : isUrgent
          ? `Vence en ${d.days} día${d.days !== 1 ? 's' : ''}`
          : `${d.days} días`;

        return (
          <div key={d.label} className={`flex items-center gap-3 rounded-xl p-3 border ${bg}`}>
            <Icon size={18} className={`${iconClr} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${textClr}`}>{d.label}</p>
              <p className="text-[10px] text-gray-500">
                Vencimiento: {d.due.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              isPast ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
            }`}>
              {badge}
            </span>
          </div>
        );
      })}

      {/* Retention info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
        <p className="text-[10px] font-semibold text-blue-700 mb-1">
          ℹ️ Retención Honorarios — F29 línea 48
        </p>
        <p className="text-[10px] text-blue-600 leading-relaxed">
          Si pagas <strong>boletas de honorarios</strong>, debes retener y declarar en el F29.
          Verifica la tasa vigente en sii.cl (aumenta gradualmente hasta 17% en 2028).
          Esta retención va a la misma declaración mensual F29 junto al IVA y PPM.
        </p>
      </div>

      <p className="text-[9px] text-gray-400 text-center px-2">
        Fechas referenciales. Si el día 12 cae en fin de semana o festivo, SII extiende al siguiente día hábil.
        Siempre verifique en sii.cl antes de declarar.
      </p>
    </div>
  );
}
