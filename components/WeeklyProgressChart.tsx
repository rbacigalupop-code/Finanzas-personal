'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

interface DayData {
  day: string;
  date: string;
  total: number;
  isToday: boolean;
  isFuture: boolean;
}

interface Props {
  days: DayData[];
  dailyLimit: number | null;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DayData;
  if (d.isFuture) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1">{d.day} {new Date(d.date + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}</p>
      <p className={`font-semibold ${d.total === 0 ? 'text-gray-400' : 'text-gray-800'}`}>
        {d.total === 0 ? 'Sin gastos' : `$${d.total.toLocaleString()}`}
      </p>
      {d.isToday && <p className="text-indigo-400 mt-0.5">← Hoy</p>}
    </div>
  );
}

function CustomXAxisTick({ x, y, payload, days, dailyLimit }: any) {
  const d = days?.find((dd: DayData) => dd.day === payload.value);
  const over = d && dailyLimit && d.total > dailyLimit;
  const isToday = d?.isToday;
  return (
    <text
      x={x} y={y + 12}
      textAnchor="middle"
      fontSize={11}
      fontWeight={isToday ? 700 : 400}
      fill={isToday ? '#6366f1' : '#9ca3af'}
    >
      {payload.value}
    </text>
  );
}

export default function WeeklyProgressChart({ days, dailyLimit }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={days} margin={{ top: 20, right: 8, left: -24, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={(props) => <CustomXAxisTick {...props} days={days} dailyLimit={dailyLimit} />}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v === 0 ? '' : `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb', radius: 6 }} />

        {/* Daily limit reference line */}
        {dailyLimit && (
          <ReferenceLine
            y={dailyLimit}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: `Límite $${Math.round(dailyLimit).toLocaleString()}`, fontSize: 9, fill: '#f59e0b', position: 'insideTopRight' }}
          />
        )}

        <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={32}>
          {days.map((d, i) => {
            const over = dailyLimit && d.total > dailyLimit;
            const color = d.isFuture
              ? '#f3f4f6'
              : d.isToday
              ? '#6366f1'
              : over
              ? '#ef4444'
              : d.total === 0
              ? '#e5e7eb'
              : '#22c55e';
            return <Cell key={i} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
