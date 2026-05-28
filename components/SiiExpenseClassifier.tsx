'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, ExternalLink, Building2 } from 'lucide-react';
import { getGiroRule, getActivityCategory } from '@/lib/sii-giros';

interface Props {
  giro?: string;
  activityCategory?: string;
  expenseCategoryName?: string;
}

// ── Base criteria (Art. 31 LIR) — apply to all giros ─────────────────────────
interface Criterion {
  id: string;
  question: string;
  status: 'ok' | 'review' | 'rejected';
  /** Detail shown when user answers */
  detail: (giro?: GiroContext) => string;
  /** If null, criterion is neutral for the overall result */
  weight: 'critical' | 'normal' | 'flag';
}

interface GiroContext {
  giro?: string;
  activityCategory?: string;
  expenseCategoryName?: string;
  label?: string;
}

const CRITERIA: Criterion[] = [
  {
    id: 'necessary',
    question: '¿El gasto es necesario para producir ingresos del giro declarado?',
    status: 'ok',
    weight: 'critical',
    detail: (g) =>
      `Art. 31 LIR: Solo son deducibles los gastos "necesarios para producir la renta". ` +
      (g?.label
        ? `Para el giro "${g.label}", debe haber una relación directa entre este gasto y la actividad económica.`
        : `Debe existir relación directa entre el gasto y la actividad económica declarada ante el SII.`),
  },
  {
    id: 'documented',
    question: '¿El gasto está respaldado con factura electrónica válida (sin errores)?',
    status: 'ok',
    weight: 'critical',
    detail: () =>
      `SII exige documentación tributaria válida. La factura debe tener RUT del emisor activo, ` +
      `fecha correcta y detalle del bien o servicio. Facturas con errores o de proveedores bloqueados ` +
      `no acreditan crédito fiscal IVA ni gasto tributario.`,
  },
  {
    id: 'rut_active',
    question: '¿El RUT del proveedor está activo en el SII (sin bloqueo ni timbraje suspendido)?',
    status: 'ok',
    weight: 'normal',
    detail: () =>
      `Verifica en sii.cl → "Consulta situación tributaria de terceros". Si el proveedor tiene ` +
      `RUT bloqueado, actividad suspendida o es una empresa de papel ("fantasma"), ` +
      `el SII puede rechazar tanto el gasto como el crédito fiscal IVA asociado.`,
  },
  {
    id: 'giro_match',
    question: '¿El gasto corresponde a una categoría típica de tu giro?',
    status: 'review',
    weight: 'normal',
    detail: (g) =>
      g?.activityCategory && g.activityCategory !== 'other'
        ? `Para el giro "${g.label}", los gastos aceptados típicamente incluyen: ` +
          (getGiroRule(g.activityCategory).typicalExpenses.slice(0, 3).join(', ')) +
          `. Si este gasto es de un tipo diferente, puede requerir mayor justificación.`
        : `Sin giro configurado, el SII evalúa caso a caso. Agrega tu giro en el perfil de la empresa ` +
          `para obtener orientación específica.`,
  },
  {
    id: 'no_personal',
    question: '¿El gasto NO tiene componente de uso personal del dueño o su familia?',
    status: 'rejected',
    weight: 'critical',
    detail: () =>
      `Art. 21 LIR — "Gastos rechazados": los gastos de uso personal del propietario, socios o ` +
      `familiares se consideran retiro y tributan con impuesto único del 40%. Son los gastos más ` +
      `frecuentemente objetados en fiscalizaciones del SII.`,
  },
  {
    id: 'no_fine',
    question: '¿El gasto NO es una multa, interés por deuda tributaria ni sanción?',
    status: 'rejected',
    weight: 'critical',
    detail: () =>
      `Art. 31 N°1 LIR: Las multas, intereses moratorios al SII/Tesorería y sanciones legales ` +
      `no son deducibles como gasto tributario bajo ninguna circunstancia.`,
  },
  {
    id: 'period',
    question: '¿El gasto corresponde al período tributario actual (devengado o pagado)?',
    status: 'review',
    weight: 'normal',
    detail: () =>
      `El gasto debe corresponder al período en que se reconoce. En régimen de renta efectiva ` +
      `simplificada (Pyme): gastos pagados en el año. En régimen general: gastos devengados. ` +
      `Gastos de períodos anteriores pueden no ser deducibles en el año actual.`,
  },
  {
    id: 'representation',
    question: '¿Si es almuerzo, regalo o entretención: el monto es razonable y tiene respaldo del cliente?',
    status: 'review',
    weight: 'flag',
    detail: () =>
      `Circular SII 37/2009: los "gastos de representación" (comidas, regalos, entretención a clientes) ` +
      `son aceptados solo hasta el 1,5% de los ingresos brutos anuales. Sobre ese límite son ` +
      `gastos rechazados (art. 21 LIR). Documente siempre el nombre del cliente y el propósito.`,
  },
];

const STATUS_CONFIG = {
  ok:       { color: 'text-green-700', bg: 'bg-green-50 border-green-200',   Icon: CheckCircle2,  label: '✅ Aceptado por SII'          },
  review:   { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',   Icon: AlertTriangle, label: '⚠️ Consultar con contador'    },
  rejected: { color: 'text-red-700',   bg: 'bg-red-50 border-red-200',       Icon: XCircle,       label: '❌ Riesgo de rechazo SII'     },
};

// Extracted sub-component so the Icon reference is a plain capitalized name (JSX requirement)
function OverallBanner({ overall }: { overall: 'ok' | 'review' | 'rejected' }) {
  const cfg  = STATUS_CONFIG[overall];
  const Icon = cfg.Icon;
  return (
    <div className={`flex items-center gap-2 rounded-xl p-2.5 border ${cfg.bg}`}>
      <Icon size={16} className={cfg.color} />
      <div className="flex-1">
        <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
        {overall === 'rejected' && (
          <p className="text-[10px] text-red-600">Consulta con tu contador antes de incluir este gasto</p>
        )}
        {overall === 'ok' && (
          <p className="text-[10px] text-green-600">El gasto parece cumplir los requisitos del Art. 31 LIR</p>
        )}
      </div>
    </div>
  );
}

export default function SiiExpenseClassifier({ giro, activityCategory, expenseCategoryName }: Props) {
  const [open, setOpen]       = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>(
    Object.fromEntries(CRITERIA.map((c) => [c.id, null]))
  );

  const giroRule    = getGiroRule(activityCategory);
  const actCategory = getActivityCategory(activityCategory);
  const giroCtx: GiroContext = {
    giro,
    activityCategory,
    expenseCategoryName,
    label: actCategory?.label,
  };

  // Determine if selected expense category is in stronglyAccepted for this giro
  const isCategoryStronglyAccepted =
    expenseCategoryName &&
    giroRule.stronglyAccepted.some((name) =>
      expenseCategoryName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(expenseCategoryName.toLowerCase())
    );

  // Compute overall result
  const criticalFail = CRITERIA.filter((c) => c.weight === 'critical' && c.status === 'rejected')
    .some((c) => answers[c.id] === false); // answered NO to a "don't do this" = bad
  const criticalMissing = CRITERIA.filter((c) => c.weight === 'critical' && c.status === 'ok')
    .some((c) => answers[c.id] === false); // answered NO to a required criterion
  const hasReview = CRITERIA.filter((c) => c.status === 'review')
    .some((c) => answers[c.id] === true); // flagged a review item

  const answeredCount = Object.values(answers).filter((v) => v !== null).length;

  const overall: 'ok' | 'review' | 'rejected' | null =
    answeredCount === 0    ? null :
    criticalFail           ? 'rejected' :
    criticalMissing        ? 'rejected' :
    hasReview              ? 'review' :
    'ok';

  function toggle(id: string, val: boolean) {
    setAnswers((prev) => ({ ...prev, [id]: prev[id] === val ? null : val }));
  }

  return (
    <div className="border border-dashed border-amber-300 rounded-2xl overflow-hidden">
      {/* Header trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 bg-amber-50 text-left"
      >
        <span className="text-base">🧾</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-800">Verificador SII — ¿Es gasto aceptado?</p>
          <p className="text-[10px] text-amber-600 truncate">
            {actCategory
              ? `Giro: ${actCategory.icon} ${actCategory.label}`
              : 'Configura el giro de tu empresa para orientación específica'}
            {expenseCategoryName ? ` · Categoría: ${expenseCategoryName}` : ''}
          </p>
        </div>
        {overall && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            overall === 'ok' ? 'bg-green-100 text-green-700' :
            overall === 'review' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {overall === 'ok' ? '✅' : overall === 'review' ? '⚠️' : '❌'}
          </span>
        )}
        {open
          ? <ChevronUp size={16} className="text-amber-500 shrink-0" />
          : <ChevronDown size={16} className="text-amber-500 shrink-0" />}
      </button>

      {open && (
        <div className="bg-white p-3 space-y-3">
          {/* Giro-specific guidance */}
          {actCategory && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 size={13} className="text-blue-500 shrink-0" />
                <p className="text-[11px] font-bold text-blue-700">
                  Orientación para giro: {actCategory.icon} {actCategory.label}
                </p>
              </div>

              {/* Category-specific acceptance */}
              {expenseCategoryName && (
                <div className={`rounded-lg px-2 py-1.5 text-[10px] font-medium ${
                  isCategoryStronglyAccepted
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {isCategoryStronglyAccepted
                    ? `✅ "${expenseCategoryName}" es un gasto típicamente aceptado para este giro.`
                    : `⚠️ "${expenseCategoryName}" requiere mayor justificación en este giro.`}
                </div>
              )}

              <div>
                <p className="text-[10px] font-semibold text-blue-600 mb-1">Gastos típicamente aceptados:</p>
                <ul className="space-y-0.5">
                  {giroRule.typicalExpenses.map((e, i) => (
                    <li key={i} className="text-[10px] text-blue-600 flex gap-1">
                      <span className="text-green-500 shrink-0">•</span>{e}
                    </li>
                  ))}
                </ul>
              </div>

              {giroRule.risks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-amber-600 mb-1">⚠️ Riesgos frecuentes en este giro:</p>
                  {giroRule.risks.map((r, i) => (
                    <p key={i} className="text-[10px] text-amber-600 flex gap-1">
                      <span className="shrink-0">·</span>{r}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-blue-500 italic leading-relaxed">{giroRule.siiNote}</p>
            </div>
          )}

          {!actCategory && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-gray-600">Sin giro configurado</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Edita el perfil de tu empresa y agrega el giro + categoría de actividad SII
                para obtener orientación específica a tu negocio.
              </p>
            </div>
          )}

          {/* Overall result banner */}
          {overall && <OverallBanner overall={overall} />}

          {/* Criteria checklist */}
          <div className="space-y-3">
            {CRITERIA.map((criterion) => {
              const isRejected = criterion.status === 'rejected';
              // For "rejected" criteria, answering YES means "yes, this IS a problem"
              // For "ok" criteria, answering YES means "yes, this IS correct"
              const answer = answers[criterion.id];
              const isAnswered = answer !== null;

              // Determine if this answer is a warning
              const isWarning =
                (isRejected && answer === true) ||
                (criterion.status === 'ok' && criterion.weight === 'critical' && answer === false);

              return (
                <div key={criterion.id} className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    {criterion.status === 'rejected'
                      ? <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                      : criterion.status === 'review'
                      ? <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      : <CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" />}
                    <p className="text-[11px] text-gray-700 flex-1 leading-snug">{criterion.question}</p>
                  </div>

                  <div className="flex gap-2 ml-5">
                    {[true, false].map((val) => {
                      const isActive = answer === val;
                      const btnWarning = isActive && isWarning;
                      return (
                        <button
                          key={String(val)}
                          onClick={() => toggle(criterion.id, val)}
                          className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                            isActive
                              ? btnWarning
                                ? 'bg-red-100 border-red-400 text-red-700'
                                : 'bg-green-100 border-green-400 text-green-700'
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                        >
                          {val ? 'Sí' : 'No'}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div className={`ml-5 text-[10px] leading-relaxed rounded-lg p-2 ${
                      isWarning ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
                    }`}>
                      {criterion.detail(giroCtx)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <button
              onClick={() => setAnswers(Object.fromEntries(CRITERIA.map((c) => [c.id, null])))}
              className="text-[10px] text-gray-400 underline"
            >
              Reiniciar
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
            Clasificación referencial basada en Art. 31 LIR y circulares SII.
            No reemplaza la revisión de un contador certificado.
          </p>
        </div>
      )}
    </div>
  );
}
