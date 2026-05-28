'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, TrendingUp, TrendingDown, Wallet, CreditCard, RefreshCw, BarChart2 } from 'lucide-react';
import AlertBanner from '@/components/AlertBanner';
import SpendingChart from '@/components/SpendingChart';

interface DashboardData {
  income: number;
  expenses: number;
  balance: number;
  spending: Array<{ id: number; name: string; color: string; icon: string; total: number }>;
  budgets: Array<{ category_id: number; limit_amount: number }>;
  recent: Array<{
    id: number; type: string; amount: number; description: string; date: string;
    category_name: string; category_icon: string; category_color: string;
  }>;
  month: number;
  year: number;
}

interface DebtSummary { totalDebt: number; debtCount: number; totalRecurring: number; }

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then(setData);
    Promise.all([
      fetch('/api/debts').then((r) => r.json()),
      fetch('/api/recurring?active=true').then((r) => r.json()),
    ]).then(([debts, recurring]) => {
      const totalDebt = debts.reduce((s: number, d: any) => s + Number(d.current_balance), 0);
      const totalRecurring = recurring.reduce((s: number, r: any) => s + Number(r.amount), 0);
      setDebtSummary({ totalDebt, debtCount: debts.length, totalRecurring });
    });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const savingsRate = data.income > 0 ? Math.round(((data.income - data.expenses) / data.income) * 100) : 0;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{MONTH_NAMES[data.month - 1]} {data.year}</p>
          <h1 className="text-2xl font-bold text-gray-900">Mi Finanzas</h1>
        </div>
        <Link href="/transactions/new">
          <button className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-transform">
            <Plus size={24} className="text-white" />
          </button>
        </Link>
      </div>

      {/* Alerts */}
      <AlertBanner />

      {/* Balance card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={16} className="opacity-80" />
          <p className="text-sm opacity-80">Balance del mes</p>
        </div>
        <p className={`text-4xl font-bold mb-4 ${data.balance < 0 ? 'text-red-200' : ''}`}>
          ${Math.abs(data.balance).toLocaleString()}
          {data.balance < 0 && <span className="text-lg ml-1">negativo</span>}
        </p>
        <div className="flex gap-4">
          <div className="flex-1 bg-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp size={14} className="text-green-300" />
              <span className="text-xs opacity-80">Ingresos</span>
            </div>
            <p className="text-lg font-bold">${data.income.toLocaleString()}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown size={14} className="text-red-300" />
              <span className="text-xs opacity-80">Gastos</span>
            </div>
            <p className="text-lg font-bold">${data.expenses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Savings rate */}
      {data.income > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Tasa de ahorro</span>
            <span className={`text-sm font-bold ${savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
              {savingsRate}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${savingsRate >= 20 ? 'bg-green-500' : savingsRate >= 10 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick-access cards: Debts / Recurring / Projections */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/debts">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <CreditCard size={18} className="text-red-400" />
            <p className="text-[10px] text-gray-400 font-medium">Deudas</p>
            <p className="text-sm font-bold text-red-500">
              {debtSummary
                ? `$${Math.round(debtSummary.totalDebt / 1000)}k`
                : '—'}
            </p>
          </div>
        </Link>
        <Link href="/debts?tab=recurring">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <RefreshCw size={18} className="text-indigo-400" />
            <p className="text-[10px] text-gray-400 font-medium">Fijos/mes</p>
            <p className="text-sm font-bold text-indigo-600">
              {debtSummary
                ? `$${Math.round(debtSummary.totalRecurring / 1000)}k`
                : '—'}
            </p>
          </div>
        </Link>
        <Link href="/projections">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <BarChart2 size={18} className="text-emerald-400" />
            <p className="text-[10px] text-gray-400 font-medium">Proyección</p>
            <p className="text-sm font-bold text-emerald-600">Ver →</p>
          </div>
        </Link>
      </div>

      {/* Budget progress */}
      {data.budgets.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Presupuesto por categoría</h2>
          {data.spending
            .filter((s) => data.budgets.find((b) => b.category_id === s.id))
            .slice(0, 5)
            .map((cat) => {
              const budget = data.budgets.find((b) => b.category_id === cat.id);
              if (!budget) return null;
              const pct = Math.min(100, Math.round((cat.total / budget.limit_amount) * 100));
              const over = cat.total > budget.limit_amount;
              return (
                <div key={cat.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">{cat.icon} {cat.name}</span>
                    <span className={`text-xs font-medium ${over ? 'text-red-600' : 'text-gray-500'}`}>
                      ${cat.total.toLocaleString()} / ${budget.limit_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Spending chart */}
      {data.spending.some((s) => s.total > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm mb-2">Distribución de gastos</h2>
          <SpendingChart data={data.spending} />
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900 text-sm">Últimos movimientos</h2>
          <Link href="/transactions" className="text-xs text-indigo-600 font-medium">Ver todos</Link>
        </div>
        {data.recent.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm">Sin movimientos este mes</p>
            <Link href="/transactions/new">
              <button className="mt-3 text-indigo-600 text-sm font-medium">+ Agregar primero</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: t.category_color + '20' }}>
                  {t.category_icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.description || t.category_name}</p>
                  <p className="text-xs text-gray-400">{t.category_name} · {new Date(t.date + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link href="/transactions/new" className="fixed bottom-20 right-4">
        <button className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-300 active:scale-95 transition-transform">
          <Plus size={28} className="text-white" />
        </button>
      </Link>
    </div>
  );
}
