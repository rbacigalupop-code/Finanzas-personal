'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Category {
  name: string;
  color: string;
  icon: string;
  total: number;
}

interface Props {
  data: Category[];
}

export default function SpendingChart({ data }: Props) {
  const filtered = data.filter((d) => d.total > 0);
  if (!filtered.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Sin gastos este mes
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="total"
          nameKey="name"
        >
          {filtered.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
        />
        <Legend
          formatter={(value, entry) => {
            const cat = filtered.find((d) => d.name === value);
            return `${cat?.icon || ''} ${value}`;
          }}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
