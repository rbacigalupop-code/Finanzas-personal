'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

interface MonthlyRow {
  month: string;     // "01" … "12"
  net_income: number;
  net_expenses: number;
  net_profit: number;
}

interface Props {
  data: MonthlyRow[];
}

const MONTH_SHORT = ['', 'Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const fmt = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : Math.abs(n) >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${Math.round(n)}`;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function BusinessCharts({ data }: Props) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    mes:      MONTH_SHORT[parseInt(d.month)] || d.month,
    Ingresos: Math.round(d.net_income),
    Gastos:   Math.round(d.net_expenses),
    Resultado: Math.round(d.net_profit),
  }));

  // Margin chart data (keep separate for second chart)
  const marginData = data.map((d) => {
    const margin = d.net_income > 0 ? Math.round((d.net_profit / d.net_income) * 100) : 0;
    return {
      mes: MONTH_SHORT[parseInt(d.month)] || d.month,
      Margen: margin,
    };
  });

  return (
    <div className="space-y-4">
      {/* Income vs Expenses bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Ingresos vs Gastos — últimos meses
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={fmt}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
            />
            <Bar dataKey="Ingresos"  fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Gastos"    fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Resultado" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gross margin % line chart */}
      {marginData.some((d) => d.Margen !== 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Margen bruto mensual (%)
          </p>
          <div className="flex items-end gap-1 h-16">
            {marginData.map((d, i) => {
              const pct = Math.max(0, Math.min(100, d.Margen));
              const color = pct >= 40 ? '#10b981' : pct >= 20 ? '#f59e0b' : '#ef4444';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{ height: `${pct}%`, minHeight: pct > 0 ? 4 : 0, backgroundColor: color }}
                  />
                  <span className="text-[9px] text-gray-400">{d.mes}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {[{ label: '≥40% Saludable', color: '#10b981' },{ label: '20–39% Aceptable', color: '#f59e0b' },{ label: '<20% Bajo', color: '#ef4444' }]
              .map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[9px] text-gray-500">{l.label}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
