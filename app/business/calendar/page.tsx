'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import CompanySelector from '@/components/CompanySelector';
import SiiAlerts from '@/components/SiiAlerts';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { getF29DueDate } from '@/components/SiiAlerts';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString('es-CL');

interface DayData {
  income: number;
  expense: number;
  count: number;
  entries: Array<{ id: number; type: string; amount: number; desc: string; icon: string; doc: string }>;
}

export default function BusinessCalendarPage() {
  const { activeCompany } = useCompany();
  const now = new Date();

  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [byDay, setByDay] = useState<Record<string, DayData>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    const res = await fetch(`/api/business/calendar?year=${year}&month=${month}&company_id=${activeCompany.id}`);
    const data = await res.json();
    setByDay(data.byDay || {});
    setSelectedDay(null);
    setLoading(false);
  }, [activeCompany, year, month]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay  = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysCount = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  // SII F29 deadline for the *previous* month (falls within this calendar month on day ~12)
  const prevMonthNum = month === 1 ? 12 : month - 1;
  const prevYearNum  = month === 1 ? year - 1 : year;
  const f29Due       = getF29DueDate(prevYearNum, prevMonthNum);
  const f29Day       = f29Due.getFullYear() === year && f29Due.getMonth() + 1 === month
    ? f29Due.getDate()
    : null;

  // Also next month's F29 deadline that falls in this calendar (for current month taxes)
  const f29Curr       = getF29DueDate(year, month);
  const f29CurrDay    = f29Curr.getFullYear() === year && f29Curr.getMonth() + 1 === month
    ? f29Curr.getDate()
    : null;

  const siiDays = new Set<number>();
  if (f29Day)     siiDays.add(f29Day);
  if (f29CurrDay) siiDays.add(f29CurrDay);

  // Monthly totals
  const totalIncome  = Object.values(byDay).reduce((s, d) => s + d.income,  0);
  const totalExpense = Object.values(byDay).reduce((s, d) => s + d.expense, 0);

  const selectedData = selectedDay ? byDay[selectedDay] : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{
        background: activeCompany
          ? `linear-gradient(135deg, ${activeCompany.color}dd, ${activeCompany.color}88)`
          : 'linear-gradient(135deg, #10b981dd, #10b98188)',
      }}>
        <div className="flex items-center justify-between mb-3">
          {activeCompany ? <CompanySelector /> : (
            <div className="flex items-center gap-2">
              <CalendarDays size={22} className="text-white/90" />
              <h1 className="text-white font-bold text-xl">Calendario</h1>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={16} className="text-white/70" />
          <p className="text-white font-semibold">Calendario tributario</p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-between bg-white/15 rounded-2xl p-2">
          <button onClick={prevMonth} className="p-2 rounded-xl bg-white/20 text-white active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-base">{MONTHS[month - 1]}</p>
            <p className="text-white/70 text-sm">{year}</p>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-xl bg-white/20 text-white active:scale-95">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Monthly summary pills */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500">Ingresos del mes</p>
              <p className="text-sm font-bold text-emerald-700">${fmt(totalIncome)}</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-2">
            <TrendingDown size={18} className="text-red-500 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500">Gastos del mes</p>
              <p className="text-sm font-bold text-red-600">${fmt(totalExpense)}</p>
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center">
                <span className="text-[10px] font-semibold text-gray-400">{d}</span>
              </div>
            ))}
          </div>

          {/* Cells */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`e${idx}`} className="h-14 border-b border-r border-gray-50" />;
                }

                const dayStr    = String(day).padStart(2, '0');
                const data      = byDay[dayStr];
                const isSii     = siiDays.has(day);
                const isToday   = year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
                const isSelected = selectedDay === dayStr;
                const hasIncome  = data?.income  > 0;
                const hasExpense = data?.expense > 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : dayStr)}
                    className={`h-14 border-b border-r border-gray-50 flex flex-col items-center justify-start pt-1.5 gap-0.5 transition-colors ${
                      isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : isSii
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-700'
                    }`}>
                      {day}
                    </span>
                    <div className="flex gap-0.5">
                      {hasIncome  && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      {hasExpense && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                      {isSii      && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 py-2 border-t border-gray-50">
            {[
              { color: 'bg-indigo-600', label: 'Hoy' },
              { color: 'bg-emerald-500', label: 'Ingreso' },
              { color: 'bg-red-400', label: 'Gasto' },
              { color: 'bg-orange-500', label: 'Vto. F29' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${l.color}`} />
                <span className="text-[9px] text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-800">
                {parseInt(selectedDay, 10)} de {MONTHS[month - 1]}
              </p>
              {selectedData ? (
                <p className="text-xs text-gray-500">
                  {selectedData.count} transacción{selectedData.count !== 1 ? 'es' : ''} · +${fmt(selectedData.income)} / -${fmt(selectedData.expense)}
                </p>
              ) : siiDays.has(parseInt(selectedDay, 10)) ? (
                <p className="text-xs text-orange-600 font-medium">📅 Vencimiento F29 — SII</p>
              ) : (
                <p className="text-xs text-gray-400">Sin movimientos registrados</p>
              )}
            </div>

            {siiDays.has(parseInt(selectedDay, 10)) && (
              <div className="mx-4 my-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-xs font-bold text-orange-700">⚠️ Vencimiento F29 — Formulario 29 SII</p>
                <p className="text-xs text-orange-600 mt-1">
                  Este es el plazo límite para declarar y pagar IVA, PPM y retenciones del período anterior.
                  Si cae en fin de semana o festivo, SII extiende al siguiente día hábil.
                </p>
              </div>
            )}

            {selectedData?.entries.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-50">
                <span className="text-lg">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{e.desc}</p>
                  <p className="text-xs text-gray-400">{e.doc}</p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${e.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {e.type === 'income' ? '+' : '-'}${fmt(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* SII Alerts */}
        <SiiAlerts />

        {/* Disclaimer */}
        <DisclaimerBanner />
      </div>
    </div>
  );
}
