'use client';

import { useEffect, useState } from 'react';
import ProjectionChart from '@/components/ProjectionChart';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface Projection {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

interface CategoryProjection {
  name: string;
  color: string;
  icon: string;
  current: number;
  budget: number | null;
  overBudget: boolean;
}

interface Data {
  history: Projection[];
  projections: Projection[];
  categoryProjections: CategoryProjection[];
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return `${MONTH_NAMES[parseInt(mo) - 1]} ${y}`;
};

export default function ProjectionsPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch('/api/projections').then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const next3 = data.projections.slice(0, 3);
  const projectedSavings = next3.reduce((a, p) => a + p.savings, 0);
  const avgExpenses = data.projections.length ? data.projections.reduce((a, p) => a + p.expenses, 0) / data.projections.length : 0;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Proyecciones</h1>

      {data.history.length < 2 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-500" />
            <p className="text-sm font-medium text-amber-800">Datos insuficientes</p>
          </div>
          <p className="text-xs text-amber-700">Registra movimientos durante al menos 2 meses para ver proyecciones precisas.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <TrendingUp size={18} className="text-green-500 mb-2" />
              <p className="text-xs text-gray-500">Ahorro proyectado 3m</p>
              <p className={`text-lg font-bold ${projectedSavings >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                ${Math.abs(projectedSavings).toLocaleString()}
              </p>
              {projectedSavings < 0 && <p className="text-xs text-red-400">déficit</p>}
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <TrendingDown size={18} className="text-red-400 mb-2" />
              <p className="text-xs text-gray-500">Gasto promedio proyectado</p>
              <p className="text-lg font-bold text-gray-800">${Math.round(avgExpenses).toLocaleString()}/mes</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Historial + proyección 6 meses</h2>
            <ProjectionChart history={data.history} projections={data.projections} />
          </div>
        </>
      )}

      {/* Monthly projections table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">Proyección mensual</h2>
        </div>
        {data.projections.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Sin datos de proyección</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.projections.map((p) => (
              <div key={p.month} className="flex items-center px-4 py-3 gap-3">
                <div className="w-14">
                  <p className="text-xs font-bold text-gray-700">{formatMonth(p.month)}</p>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-1 text-right">
                  <div>
                    <p className="text-[10px] text-gray-400">Ingreso</p>
                    <p className="text-xs font-medium text-green-600">${p.income.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Gasto</p>
                    <p className="text-xs font-medium text-red-500">${p.expenses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Ahorro</p>
                    <p className={`text-xs font-bold ${p.savings >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                      {p.savings < 0 ? '-' : '+'}${Math.abs(p.savings).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category projections */}
      {data.categoryProjections.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Categorías este mes</h2>
          {data.categoryProjections.map((cat) => (
            <div key={cat.name} className="flex items-center gap-3">
              <span className="text-xl w-8">{cat.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-700">{cat.name}</p>
                  <p className={`text-xs font-medium ${cat.overBudget ? 'text-red-600' : 'text-gray-500'}`}>
                    ${cat.current.toLocaleString()}{cat.budget ? ` / $${cat.budget.toLocaleString()}` : ''}
                  </p>
                </div>
                {cat.budget && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.overBudget ? 'bg-red-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, (cat.current / cat.budget) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              {cat.overBudget && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
