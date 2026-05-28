'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

// ── SII Art. 31 LIR — Expense classification rules ─────────────────────────
interface Rule {
  label: string;
  status: 'ok' | 'review' | 'rejected';
  detail: string;
}

const RULES: Rule[] = [
  {
    status: 'ok',
    label: '¿El gasto es necesario para producir los ingresos del giro?',
    detail: 'Art. 31 LIR: solo son deducibles gastos necesarios para producir la renta. Debe existir relación directa con la actividad económica declarada.',
  },
  {
    status: 'ok',
    label: '¿Tienes la factura (o boleta) que respalda este gasto?',
    detail: 'SII exige documentación tributaria de respaldo (factura, boleta, liquidación). Sin documento válido el gasto puede ser rechazado.',
  },
  {
    status: 'ok',
    label: '¿El gasto fue pagado en el mismo período contable?',
    detail: 'Los gastos deben corresponder al período en que se devengan o pagan (régimen devengado o percibido según tu régimen tributario).',
  },
  {
    status: 'review',
    label: '¿Incluye alimentación, entretenimiento o regalos a clientes?',
    detail: 'Circular SII 37/2009: gastos de representación son aceptados hasta 1,5% de los ingresos brutos anuales. Montos superiores son gastos rechazados (art. 21 LIR) y tributan con impuesto único 40%.',
  },
  {
    status: 'review',
    label: '¿Es un bien de uso mixto (personal y empresarial)?',
    detail: 'Vehículos, celulares, computadores de uso mixto: SII acepta solo la proporción de uso empresarial. Se recomienda documentar el porcentaje de uso con un registro.',
  },
  {
    status: 'review',
    label: '¿El proveedor tiene RUT válido y está activo en SII?',
    detail: 'Si el proveedor tiene RUT bloqueado o es informal, SII puede objetar el crédito fiscal IVA y rechazar el gasto. Verifica en sii.cl → "Consulta de RUT".',
  },
  {
    status: 'rejected',
    label: '¿Es un gasto personal o del hogar del dueño/socios?',
    detail: 'Gastos personales (ropa, supermercado familiar, viajes vacacionales) son gastos rechazados. Generan impuesto adicional 40% (art. 21 LIR) y no son deducibles.',
  },
  {
    status: 'rejected',
    label: '¿Es una multa, interés de deuda tributaria o sanción?',
    detail: 'Las multas e intereses pagados al SII, Tesorería u otros organismos fiscales no son gasto tributario deducible (art. 31 N°9 LIR).',
  },
  {
    status: 'rejected',
    label: '¿Es una donación sin franquicia tributaria vigente?',
    detail: 'Solo son deducibles donaciones a entidades con franquicia aprobada (universidades, municipios, bomberos, etc.) y dentro de los límites legales.',
  },
];

const STATUS_CONFIG = {
  ok:       { color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  icon: CheckCircle2,    label: 'Aceptado SII'      },
  review:   { color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle,   label: 'Revisar con contador' },
  rejected: { color: 'text-red-700',    bg: 'bg-red-50 border-red-200',      icon: XCircle,         label: 'Probable rechazo'  },
};

interface UserAnswer {
  yes: boolean | null;
}

export default function SiiExpenseClassifier() {
  const [open, setOpen]       = useState(false);
  const [answers, setAnswers] = useState<(boolean | null)[]>(RULES.map(() => null));

  const answered   = answers.filter((a) => a !== null).length;
  const hasRejected = RULES.some((r, i) => r.status === 'rejected' && answers[i] === true);
  const hasReview   = RULES.some((r, i) => r.status === 'review'   && answers[i] === true);
  const hasOkAll    = RULES.filter((r) => r.status === 'ok').every((r, i) => answers[RULES.indexOf(r)] === true);

  const overall: 'ok' | 'review' | 'rejected' | null =
    answered === 0   ? null :
    hasRejected      ? 'rejected' :
    hasReview        ? 'review' :
    hasOkAll         ? 'ok' : 'review';

  const OvIcon   = overall ? STATUS_CONFIG[overall].icon : null;

  return (
    <div className="border border-dashed border-amber-300 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 bg-amber-50 text-left"
      >
        <span className="text-base">🧾</span>
        <div className="flex-1">
          <p className="text-xs font-bold text-amber-800">Verificar si es gasto SII-aceptado</p>
          <p className="text-[10px] text-amber-600">
            {answered > 0 ? `${answered} de ${RULES.length} criterios revisados` : 'Clasifica según Art. 31 LIR antes de declarar'}
          </p>
        </div>
        {overall && OvIcon && (
          <OvIcon size={16} className={STATUS_CONFIG[overall].color} />
        )}
        {open ? <ChevronUp size={16} className="text-amber-500 shrink-0" /> : <ChevronDown size={16} className="text-amber-500 shrink-0" />}
      </button>

      {open && (
        <div className="p-3 space-y-3 bg-white">
          {/* Overall result */}
          {overall && OvIcon && (
            <div className={`flex items-center gap-2 rounded-xl p-2.5 border ${STATUS_CONFIG[overall].bg}`}>
              <OvIcon size={16} className={STATUS_CONFIG[overall].color} />
              <p className={`text-xs font-bold ${STATUS_CONFIG[overall].color}`}>
                {STATUS_CONFIG[overall].label}
              </p>
              {overall === 'rejected' && (
                <p className="text-[10px] text-red-600 ml-1">— Consulta a tu contador antes de incluirlo</p>
              )}
            </div>
          )}

          {/* Rules */}
          <div className="space-y-2">
            {RULES.map((rule, i) => {
              const cfg = STATUS_CONFIG[rule.status];
              const RuleIcon = cfg.icon;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <RuleIcon size={13} className={`${cfg.color} shrink-0 mt-0.5`} />
                    <p className="text-[11px] text-gray-700 flex-1 leading-snug">{rule.label}</p>
                  </div>
                  <div className="flex gap-2 ml-5">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        onClick={() => setAnswers((prev) => {
                          const next = [...prev];
                          next[i] = answers[i] === val ? null : val;
                          return next;
                        })}
                        className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                          answers[i] === val
                            ? val ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {val ? 'Sí' : 'No'}
                      </button>
                    ))}
                  </div>
                  {answers[i] !== null && (
                    <p className="text-[10px] text-gray-500 ml-5 leading-relaxed">{rule.detail}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reset + SII link */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <button
              onClick={() => setAnswers(RULES.map(() => null))}
              className="text-[10px] text-gray-400 underline"
            >
              Reiniciar clasificación
            </button>
            <a
              href="https://www.sii.cl/aprenda_sobre_impuestos/estudios/gastos_aceptados.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-500 font-medium"
            >
              SII — Gastos aceptados <ExternalLink size={10} />
            </a>
          </div>

          <p className="text-[9px] text-gray-400 leading-relaxed">
            Esta clasificación es referencial basada en el Art. 31 de la Ley de la Renta.
            Consulte siempre con un contador certificado antes de incluir gastos en su declaración.
          </p>
        </div>
      )}
    </div>
  );
}
