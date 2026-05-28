'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts';

interface BudgetChartItem {
  name: string;
  icon: string;
  color: string;
  presupuesto: number;
  real: number;
}

interface Props {
  data: BudgetChartItem[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as BudgetChartItem;
  const over = item.real > item.presupuesto;
  const pct = item.presupuesto > 0 ? Math.round((item.real / item.presupuesto) * 100) : 0;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-bold text-gray-800 mb-2">{item.icon} {item.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-indigo-500">Presupuesto</span>
          <span className="font-semibold">${item.presupuesto.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className={over ? 'text-red-500' : 'text-green-500'}>Real</span>
          <span className="font-semibold">${item.real.toLocaleString()}</span>
        </div>
        <div className={`mt-2 pt-2 border-t border-gray-100 font-bold flex justify-between ${over ? 'text-red-500' : 'text-green-600'}`}>
          <span>{over ? '⚠ Excedido' : '✓ OK'}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function CustomXAxisTick({ x, y, payload }: any) {
  const item = payload?.value as string;
  return (
    <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill="#6b7280">
      {item}
    </text>
  );
}

export default function BudgetChart({ data }: Props) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 16, right: 8, left: -20, bottom: 0 }}
        barCategoryGap="28%"
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="icon"
          tick={<CustomXAxisTick />}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb', radius: 8 }} />

        {/* Presupuesto bar */}
        <Bar dataKey="presupuesto" name="Presupuesto" radius={[6, 6, 0, 0]} maxBarSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill="#e0e7ff" />
          ))}
        </Bar>

        {/* Real bar — color según estado */}
        <Bar dataKey="real" name="Real" radius={[6, 6, 0, 0]} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.real > entry.presupuesto ? '#ef4444' : entry.real >= entry.presupuesto * 0.8 ? '#f59e0b' : '#22c55e'}
            />
          ))}
          <LabelList
            dataKey="real"
            position="top"
            formatter={(v) => { const n = Number(v); return n > 0 ? `$${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n}` : ''; }}
            style={{ fontSize: 9, fill: '#6b7280' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
