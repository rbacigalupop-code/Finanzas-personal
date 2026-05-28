'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Percent, Plus, Building2, Receipt } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import CompanySelector from '@/components/CompanySelector';
import ModeSwitch from '@/components/ModeSwitch';

interface DashData {
  company: { id: number; name: string; legal_type: string; rut?: string; color: string; icon: string } | null;
  year: number; month: number;
  incomeNet: number; incomeGross: number; expenseNet: number;
  netProfit: number; grossMargin: number;
  ivaDebito: number; ivaCredito: number; ivaNet: number;
  ppmRate: number; ppmAmount: number;
  spending: Array<{ name: string; color: string; icon: string; total: number }>;
  recent: Array<{
    id: number; type: string; net_amount: number; has_iva: number;
    description: string; date: string;
    category_name: string; category_icon: string; category_color: string;
    document_type: string;
  }>;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fmt = (n: number) => Math.abs(n).toLocaleString('es-CL', { maximumFractionDigits: 0 });

// ── First-run setup form ──────────────────────────────────────────────────────
const LEGAL_TYPES = ['SPA','EIRL','SA','Ltda.','Persona Natural'];
const ICONS  = ['🏢','🏭','🛍️','💼','🔧','🚀','🌿','🎨','📦','🍔','💻','🏗️'];
const COLORS = ['#10b981','#3b82f6','#8b5cf6','#f97316','#ec4899','#ef4444','#eab308','#06b6d4'];

function SetupScreen({ onCreated }: { onCreated: () => void }) {
  const [name, setName]             = useState('');
  const [legalType, setLegalType]   = useState('SPA');
  const [rut, setRut]               = useState('');
  const [color, setColor]           = useState('#10b981');
  const [icon, setIcon]             = useState('🏢');
  const [saving, setSaving]         = useState(false);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/business/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), legal_type: legalType, rut: rut.trim() || undefined, color, icon }),
    });
    if (res.ok) {
      const { id } = await res.json();
      localStorage.setItem('activeCompanyId', String(id));
      onCreated();
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-14 pb-8 text-center">
        <div className="flex justify-center mb-3">
          <ModeSwitch />
        </div>
        <Building2 size={40} className="text-white/80 mx-auto mb-3 mt-4" />
        <h1 className="text-white font-bold text-2xl">¡Crea tu primera empresa!</h1>
        <p className="text-white/70 text-sm mt-1">Gestiona ingresos, gastos e impuestos por empresa</p>
      </div>

      <div className="px-5 py-6 space-y-5 flex-1">
        {/* Icon picker */}
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">Ícono</p>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={`text-2xl p-2.5 rounded-xl border-2 transition-all ${icon === ic ? 'border-emerald-400 bg-emerald-50' : 'border-transparent bg-gray-100'}`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">Color</p>
          <div className="flex gap-3 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full border-4 transition-all ${color === c ? 'border-gray-500 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-gray-500 font-semibold mb-1 block uppercase tracking-wide">Nombre *</label>
          <input
            type="text"
            placeholder="Ej: Consultora Patagonia SPA"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        {/* Legal type */}
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">Tipo legal</p>
          <div className="flex flex-wrap gap-2">
            {LEGAL_TYPES.map((lt) => (
              <button key={lt} onClick={() => setLegalType(lt)}
                className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all ${
                  legalType === lt ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                {lt}
              </button>
            ))}
          </div>
        </div>

        {/* RUT */}
        <div>
          <label className="text-xs text-gray-500 font-semibold mb-1 block uppercase tracking-wide">RUT (opcional)</label>
          <input
            type="text"
            placeholder="76.123.456-7"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        {/* Preview */}
        {name && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: color + '30' }}>
              {icon}
            </div>
            <div>
              <p className="font-bold text-gray-800">{name}</p>
              <p className="text-xs text-gray-500">{legalType}{rut ? ` · ${rut}` : ''}</p>
            </div>
          </div>
        )}

        <button onClick={create} disabled={!name.trim() || saving}
          className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl text-base disabled:opacity-50 hover:bg-emerald-600 transition-colors"
        >
          {saving ? 'Creando...' : 'Crear empresa →'}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function BusinessDashboard() {
  const { activeCompany, loading: companyLoading, reload } = useCompany();
  const [data, setData]   = useState<DashData | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!activeCompany) return;
    setFetching(true);
    fetch(`/api/business/dashboard?company_id=${activeCompany.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setFetching(false); });
  }, [activeCompany]);

  // Loading spinner
  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // No companies yet → setup screen
  if (!activeCompany) {
    return <SetupScreen onCreated={reload} />;
  }

  const isProfitable = !data || data.netProfit >= 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-6" style={{ background: `linear-gradient(135deg, ${activeCompany.color}dd, ${activeCompany.color}99)` }}>
        <div className="flex items-center justify-between mb-4">
          <ModeSwitch />
          <Link href="/business/transactions">
            <button className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center active:scale-95">
              <Plus size={20} className="text-white" />
            </button>
          </Link>
        </div>

        <CompanySelector />

        {data && (
          <div className="mt-4">
            <p className="text-white/70 text-xs mb-1">{MONTHS[data.month - 1]} {data.year} · Resultado neto</p>
            <p className={`text-4xl font-bold text-white mb-3`}>
              {data.netProfit < 0 ? '-' : ''}${fmt(data.netProfit)}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                Margen {data.grossMargin}%
              </span>
              {isProfitable
                ? <ArrowUpRight size={14} className="text-white/80" />
                : <ArrowDownRight size={14} className="text-red-200" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/15 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp size={12} className="text-white/70" />
                  <span className="text-white/70 text-[11px]">Ingresos netos</span>
                </div>
                <p className="text-white font-bold">${fmt(data.incomeNet)}</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown size={12} className="text-white/70" />
                  <span className="text-white/70 text-[11px]">Gastos netos</span>
                </div>
                <p className="text-white font-bold">${fmt(data.expenseNet)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {fetching && !data ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500" />
        </div>
      ) : data ? (
        <div className="px-4 pt-4 space-y-4">
          {/* Tax pills */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-2xl p-3 border ${data.ivaNet > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className="flex items-center gap-1 mb-1">
                <Receipt size={12} className={data.ivaNet > 0 ? 'text-red-400' : 'text-green-500'} />
                <p className="text-[10px] font-semibold text-gray-500">IVA neto</p>
              </div>
              <p className={`text-sm font-bold ${data.ivaNet > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.ivaNet > 0 ? 'Pagar' : 'A favor'}<br />${fmt(data.ivaNet)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-gray-100">
              <div className="flex items-center gap-1 mb-1">
                <Percent size={12} className="text-amber-400" />
                <p className="text-[10px] font-semibold text-gray-500">PPM ({data.ppmRate}%)</p>
              </div>
              <p className="text-sm font-bold text-amber-600">${fmt(data.ppmAmount)}</p>
            </div>
            <Link href="/business/taxes">
              <div className="bg-white rounded-2xl p-3 border border-gray-100 h-full flex flex-col justify-between">
                <p className="text-[10px] font-semibold text-emerald-600">Ver impuestos</p>
                <p className="text-[10px] text-gray-400 mt-1">IVA · PPM → F29</p>
              </div>
            </Link>
          </div>

          {/* IVA breakdown */}
          {(data.ivaDebito > 0 || data.ivaCredito > 0) && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">IVA del mes</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Débito (ventas)</span>
                  <span className="font-semibold text-red-500">${fmt(data.ivaDebito)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Crédito (compras)</span>
                  <span className="font-semibold text-green-600">${fmt(data.ivaCredito)}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between text-sm font-bold">
                  <span>{data.ivaNet >= 0 ? 'A pagar SII' : 'Crédito a favor'}</span>
                  <span className={data.ivaNet >= 0 ? 'text-red-600' : 'text-green-600'}>${fmt(data.ivaNet)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Spending by category */}
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
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Últimos movimientos</p>
              <Link href="/business/transactions" className="text-xs text-emerald-600 font-medium">Ver todos</Link>
            </div>
            {data.recent.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">Sin movimientos este mes</p>
                <Link href="/business/transactions">
                  <button className="mt-2 text-emerald-600 text-sm font-medium">+ Registrar primero</button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recent.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: (t.category_color || activeCompany.color) + '20' }}>
                      {t.category_icon || activeCompany.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.description || t.category_name}</p>
                      <p className="text-xs text-gray-400">{t.document_type}{t.has_iva ? ' · c/IVA' : ''}</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}${fmt(t.net_amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
