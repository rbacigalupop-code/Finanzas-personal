'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Building2, Receipt,
  ArrowUpRight, ArrowDownRight, Percent, Plus,
} from 'lucide-react';

interface DashData {
  year: number; month: number;
  incomeNet: number; incomeGross: number;
  expenseNet: number; netProfit: number; grossMargin: number;
  ivaDebito: number; ivaCredito: number; ivaNet: number;
  ppmRate: number; ppmAmount: number;
  spending: Array<{ name: string; color: string; icon: string; total: number }>;
  recent: Array<{
    id: number; type: string; net_amount: number; gross_amount: number;
    has_iva: number; description: string; date: string;
    category_name: string; category_icon: string; category_color: string;
    document_type: string;
  }>;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (n: number) => Math.abs(n).toLocaleString('es-CL', { maximumFractionDigits: 0 });

export default function BusinessDashboard() {
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    fetch('/api/business/dashboard').then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const isProfitable = data.netProfit >= 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={22} className="text-white/90" />
            <div>
              <h1 className="text-white font-bold text-xl">Mi Empresa</h1>
              <p className="text-white/70 text-xs">{MONTHS[data.month - 1]} {data.year}</p>
            </div>
          </div>
          <Link href="/business/transactions/new">
            <button className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center active:scale-95">
              <Plus size={20} className="text-white" />
            </button>
          </Link>
        </div>

        {/* Main metrics */}
        <div className="bg-white/15 rounded-2xl p-4 mb-3">
          <p className="text-white/70 text-xs mb-1">Resultado neto del mes</p>
          <p className={`text-4xl font-bold text-white mb-1 ${!isProfitable ? 'text-red-200' : ''}`}>
            {!isProfitable ? '-' : ''}${fmt(data.netProfit)}
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              data.grossMargin >= 20 ? 'bg-green-400/30 text-green-100' :
              data.grossMargin >= 0  ? 'bg-amber-400/30 text-amber-100' :
                                       'bg-red-400/30 text-red-100'
            }`}>
              Margen {data.grossMargin}%
            </span>
            {isProfitable
              ? <ArrowUpRight size={14} className="text-green-300" />
              : <ArrowDownRight size={14} className="text-red-300" />}
          </div>
        </div>

        {/* Income / Expense pills */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/15 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp size={13} className="text-green-300" />
              <span className="text-white/70 text-[11px]">Ingresos netos</span>
            </div>
            <p className="text-white font-bold">${fmt(data.incomeNet)}</p>
            {data.incomeGross !== data.incomeNet && (
              <p className="text-white/50 text-[10px]">Bruto: ${fmt(data.incomeGross)}</p>
            )}
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown size={13} className="text-red-300" />
              <span className="text-white/70 text-[11px]">Gastos netos</span>
            </div>
            <p className="text-white font-bold">${fmt(data.expenseNet)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Tax summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded-2xl p-3 border ${data.ivaNet > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <div className="flex items-center gap-1 mb-1">
              <Receipt size={13} className={data.ivaNet > 0 ? 'text-red-400' : 'text-green-500'} />
              <p className="text-[10px] font-semibold text-gray-500">IVA neto</p>
            </div>
            <p className={`text-sm font-bold ${data.ivaNet > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.ivaNet > 0 ? 'Pagar' : 'A favor'}<br />
              ${fmt(data.ivaNet)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-gray-100">
            <div className="flex items-center gap-1 mb-1">
              <Percent size={13} className="text-amber-400" />
              <p className="text-[10px] font-semibold text-gray-500">PPM ({data.ppmRate}%)</p>
            </div>
            <p className="text-sm font-bold text-amber-600">${fmt(data.ppmAmount)}</p>
          </div>

          <Link href="/business/taxes">
            <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex flex-col justify-between h-full">
              <p className="text-[10px] font-semibold text-emerald-600">Ver impuestos →</p>
              <p className="text-[10px] text-gray-400 mt-1">IVA · PPM · Renta</p>
            </div>
          </Link>
        </div>

        {/* IVA breakdown */}
        {(data.ivaDebito > 0 || data.ivaCredito > 0) && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">IVA del mes</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA Débito (ventas)</span>
                <span className="font-semibold text-red-500">${fmt(data.ivaDebito)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA Crédito (compras)</span>
                <span className="font-semibold text-green-600">${fmt(data.ivaCredito)}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-700">{data.ivaNet >= 0 ? 'IVA a pagar SII' : 'Crédito a favor'}</span>
                <span className={data.ivaNet >= 0 ? 'text-red-600' : 'text-green-600'}>${fmt(data.ivaNet)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Top expenses */}
        {data.spending.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Gastos por categoría</p>
            <div className="space-y-2.5">
              {data.spending.slice(0, 5).map((s) => {
                const pct = data.expenseNet > 0 ? (Number(s.total) / data.expenseNet) * 100 : 0;
                return (
                  <div key={s.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">{s.icon} {s.name}</span>
                      <span className="text-xs font-semibold text-gray-700">${fmt(Number(s.total))}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Últimos movimientos</p>
            <Link href="/business/transactions" className="text-xs text-emerald-600 font-medium">Ver todos</Link>
          </div>
          {data.recent.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Sin movimientos este mes</p>
              <Link href="/business/transactions/new">
                <button className="mt-2 text-emerald-600 text-sm font-medium">+ Registrar primero</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: (t.category_color || '#6b7280') + '20' }}
                  >
                    {t.category_icon || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.description || t.category_name}</p>
                    <p className="text-xs text-gray-400">
                      {t.category_name} · {t.document_type}
                      {t.has_iva ? ' · c/IVA' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}${fmt(t.net_amount)}
                    </p>
                    {t.has_iva ? (
                      <p className="text-[10px] text-gray-400">neto s/IVA</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
