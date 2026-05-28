'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

interface DataPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  projected?: boolean;
}

interface Props {
  history: DataPoint[];
  projections: DataPoint[];
}

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
};

export default function ProjectionChart({ history, projections }: Props) {
  const all = [
    ...history.map((d) => ({ ...d, projected: false })),
    ...projections.map((d) => ({ ...d, projected: true })),
  ];

  const dividerMonth = projections[0]?.month;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={all} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip
          labelFormatter={(label) => formatMonth(String(label))}
          formatter={(v) => [`$${Number(v).toLocaleString()}`, '']}
          contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
        {dividerMonth && (
          <ReferenceLine x={dividerMonth} stroke="#a5b4fc" strokeDasharray="4 4" label={{ value: 'Proyección', fontSize: 10, fill: '#6366f1' }} />
        )}
        <Area type="monotone" dataKey="income" name="Ingresos" stroke="#22c55e" fill="url(#colorIncome)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="savings" name="Ahorro" stroke="#6366f1" fill="url(#colorSavings)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
