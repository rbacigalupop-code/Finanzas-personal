'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Target, RefreshCw, Calendar, CalendarDays, Pencil } from 'lucide-react';
import BudgetChart from '@/components/BudgetChart';
import WeeklyProgressChart from '@/components/WeeklyProgressChart';

// ── Types ────────────────────────────────────────────────────────────────────
interface Category { id: number; name: string; color: string; icon: string; group_label: string }
interface Budget {
  id: number; category_id: number; month: number; year: number;
  limit_amount: number; category_name: string; category_color: string;
  category_icon: string; category_group: string;
}
interface Spending { id: number; total: number }
interface DayData { day: string; date: string; total: number; isToday: boolean; isFuture: boolean }
interface WeeklyData {
  weekStart: string;
  budget: { id: number; limit_amount: number; note: string | null } | null;
  days: DayData[];
  totalSpent: number;
  dailyLimit: number | null;
  remainingBudget: number | null;
  daysLeft: number;
  daysElapsed: number;
  categorySpending: Array<{ id: number; name: string; color: string; icon: string; total: number }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const POLL_MS = 30_000;

function getMondayOfWeek(d = new Date()): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().split('T')[0];
}

function formatWeekRange(weekStart: string): string {
  const mon = new Date(weekStart + 'T12:00:00');
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const now = new Date();
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());

  // Monthly state
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spending, setSpending] = useState<Spending[]>([]);

  // Weekly state
  const [weekly, setWeekly] = useState<WeeklyData | null>(null);
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [weeklyNote, setWeeklyNote] = useState('');
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);

  // Monthly form
  const [showMonthlyForm, setShowMonthlyForm] = useState(false);
  const [selCat, setSelCat] = useState<number | null>(null);
  const [limit, setLimit] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // ── Load functions ─────────────────────────────────────────────────────────
  const loadMonthly = useCallback(async () => {
    const [budgetsRes, txsRes] = await Promise.all([
      fetch(`/api/budgets?year=${year}&month=${month}`).then((r) => r.json()),
      fetch(`/api/transactions?year=${year}&month=${month}`).then((r) => r.json()),
    ]);
    setBudgets(budgetsRes);
    const map: Record<number, number> = {};
    (txsRes as Array<{ type: string; amount: number; category_id: number }>)
      .filter((t) => t.type === 'expense')
      .forEach((t) => { map[t.category_id] = (map[t.category_id] || 0) + t.amount; });
    setSpending(Object.entries(map).map(([id, total]) => ({ id: parseInt(id), total })));
  }, [year, month]);

  const loadWeekly = useCallback(async () => {
    const data = await fetch(`/api/budgets/weekly?week_start=${weekStart}`).then((r) => r.json());
    setWeekly(data);
  }, [weekStart]);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    await Promise.all([loadMonthly(), loadWeekly()]);
    setLastUpdate(new Date());
    if (!silent) setRefreshing(false);
  }, [loadMonthly, loadWeekly]);

  useEffect(() => {
    fetch('/api/categories?type=expense').then((r) => r.json()).then((cats: Category[]) => {
      setCategories(cats);
      if (cats.length) setSelCat(cats[0].id);
    });
  }, []);

  useEffect(() => {
    loadAll();
    const iv = setInterval(() => loadAll(true), POLL_MS);
    return () => clearInterval(iv);
  }, [loadAll]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const saveMonthlyBudget = async () => {
    if (!selCat || !limit) return;
    await fetch('/api/budgets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: selCat, month, year, limit_amount: parseFloat(limit) }),
    });
    setLimit(''); setShowMonthlyForm(false); loadMonthly();
  };

  const removeMonthlyBudget = async (id: number) => {
    await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
    setBudgets((p) => p.filter((b) => b.id !== id));
  };

  const saveWeeklyBudget = async () => {
    if (!weeklyLimit) return;
    await fetch('/api/budgets/weekly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, limit_amount: parseFloat(weeklyLimit), note: weeklyNote }),
    });
    setWeeklyLimit(''); setWeeklyNote(''); setShowWeeklyForm(false); loadWeekly();
  };

  const removeWeeklyBudget = async () => {
    if (!weekly?.budget) return;
    await fetch(`/api/budgets/weekly?id=${weekly.budget.id}`, { method: 'DELETE' });
    loadWeekly();
  };

  const prevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };
  const nextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + 7);
    const next = d.toISOString().split('T')[0];
    if (next <= getMondayOfWeek()) setWeekStart(next);
  };
  const isCurrentWeek = weekStart === getMondayOfWeek();

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalBudget = budgets.reduce((a, b) => a + b.limit_amount, 0);
  const totalSpent = spending.reduce((a, s) => a + s.total, 0);
  const totalPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const overCount = budgets.filter((b) => (spending.find((s) => s.id === b.category_id)?.total ?? 0) > b.limit_amount).length;

  const chartData = budgets.map((b) => ({
    name: b.category_name, icon: b.category_icon, color: b.category_color,
    presupuesto: b.limit_amount,
    real: spending.find((s) => s.id === b.category_id)?.total || 0,
  }));

  // Group categories by group_label
  const catGroups = categories.reduce<Record<string, Category[]>>((acc, c) => {
    const g = c.group_label || 'Otros';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c); return acc;
  }, {});

  const weeklyPct = weekly?.budget && weekly.totalSpent
    ? Math.min(100, Math.round((weekly.totalSpent / weekly.budget.limit_amount) * 100))
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Presupuesto</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => loadAll()} disabled={refreshing}
            className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
            <RefreshCw size={15} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => tab === 'weekly' ? setShowWeeklyForm(!showWeeklyForm) : setShowMonthlyForm(!showMonthlyForm)}
            className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Plus size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-2xl p-1">
        <button onClick={() => setTab('weekly')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'weekly' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>
          <CalendarDays size={15} /> Semanal
        </button>
        <button onClick={() => setTab('monthly')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'monthly' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>
          <Calendar size={15} /> Mensual
        </button>
      </div>

      {/* ══════════ WEEKLY TAB ══════════ */}
      {tab === 'weekly' && (
        <div className="space-y-4">
          {/* Week navigator */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
            <button onClick={prevWeek} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 text-lg font-bold active:scale-95">‹</button>
            <div className="text-center">
              <p className="text-xs text-gray-400">{isCurrentWeek ? 'Esta semana' : 'Semana'}</p>
              <p className="text-sm font-bold text-gray-800">{formatWeekRange(weekStart)}</p>
            </div>
            <button onClick={nextWeek} disabled={isCurrentWeek}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 text-lg font-bold disabled:opacity-30 active:scale-95">›</button>
          </div>

          {/* Weekly set form */}
          {showWeeklyForm && (
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays size={15} className="text-indigo-500" />
                {weekly?.budget ? 'Editar presupuesto semanal' : 'Nuevo presupuesto semanal'}
              </h3>
              <p className="text-xs text-gray-400">{formatWeekRange(weekStart)}</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" placeholder="Límite semanal" value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    className="w-full pl-6 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <button onClick={saveWeeklyBudget}
                  className="bg-indigo-600 text-white px-4 rounded-xl font-medium text-sm active:scale-95">
                  Guardar
                </button>
              </div>
              <input type="text" placeholder="Nota (opcional)" value={weeklyNote}
                onChange={(e) => setWeeklyNote(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          )}

          {/* Weekly summary card */}
          {weekly?.budget ? (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-5 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs opacity-70 mb-0.5">Presupuesto semanal</p>
                  <p className="text-3xl font-bold">${weekly.budget.limit_amount.toLocaleString()}</p>
                  {weekly.budget.note && <p className="text-xs opacity-60 mt-0.5 italic">{weekly.budget.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setWeeklyLimit(String(weekly.budget!.limit_amount)); setWeeklyNote(weekly.budget!.note ?? ''); setShowWeeklyForm(true); }}
                    className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <Pencil size={13} />
                  </button>
                  <button onClick={removeWeeklyBudget}
                    className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                  <p className="text-[10px] opacity-70">Gastado</p>
                  <p className={`text-base font-bold ${weekly.totalSpent > weekly.budget.limit_amount ? 'text-red-300' : ''}`}>
                    ${weekly.totalSpent.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                  <p className="text-[10px] opacity-70">Disponible</p>
                  <p className={`text-base font-bold ${(weekly.remainingBudget ?? 0) < 0 ? 'text-red-300' : 'text-green-300'}`}>
                    ${Math.abs(weekly.remainingBudget ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                  <p className="text-[10px] opacity-70">Días restantes</p>
                  <p className="text-base font-bold">{weekly.daysLeft}d</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs opacity-70 mb-1.5">
                  <span>{weeklyPct}% utilizado</span>
                  {weekly.dailyLimit && (
                    <span>Límite diario: ${Math.round(weekly.dailyLimit).toLocaleString()}</span>
                  )}
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${weeklyPct >= 100 ? 'bg-red-400' : weeklyPct >= 80 ? 'bg-amber-300' : 'bg-green-400'}`}
                    style={{ width: `${weeklyPct}%` }} />
                </div>
              </div>

              <div className="flex justify-between items-center mt-3">
                {weeklyPct >= 100
                  ? <span className="text-xs bg-red-500/30 text-red-200 px-2 py-1 rounded-lg">⚠ Presupuesto semanal superado</span>
                  : weeklyPct >= 80
                  ? <span className="text-xs bg-amber-500/20 text-amber-200 px-2 py-1 rounded-lg">⚡ Cerca del límite</span>
                  : <span className="text-xs bg-green-500/20 text-green-200 px-2 py-1 rounded-lg">✓ En buen ritmo</span>}
                <span className="text-[10px] opacity-50">
                  Act. {lastUpdate.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-dashed border-indigo-200 text-center space-y-2">
              <CalendarDays size={36} className="mx-auto text-indigo-200" />
              <p className="text-sm font-medium text-gray-600">Sin objetivo para esta semana</p>
              <p className="text-xs text-gray-400">Define cuánto quieres gastar máximo esta semana</p>
              <button onClick={() => setShowWeeklyForm(true)}
                className="mt-1 text-sm font-semibold text-indigo-600">
                + Establecer objetivo semanal
              </button>
            </div>
          )}

          {/* Daily bar chart */}
          {weekly && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-gray-900">Gasto por día</h2>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />Hoy</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />OK</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Excedido</span>
                </div>
              </div>
              {weekly.dailyLimit && (
                <p className="text-[10px] text-amber-500 mb-2">— Línea amarilla = límite diario (${Math.round(weekly.dailyLimit).toLocaleString()})</p>
              )}
              <WeeklyProgressChart days={weekly.days} dailyLimit={weekly.dailyLimit} />
            </div>
          )}

          {/* Weekly category breakdown */}
          {weekly?.categorySpending && weekly.categorySpending.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Categorías esta semana</h2>
              <div className="space-y-2.5">
                {weekly.categorySpending.map((cat) => {
                  const pct = weekly.totalSpent > 0 ? Math.round((cat.total / weekly.totalSpent) * 100) : 0;
                  return (
                    <div key={cat.id} className="flex items-center gap-3">
                      <span className="text-xl w-7 shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-700 truncate">{cat.name}</span>
                          <span className="text-xs font-semibold text-gray-800 ml-2 shrink-0">${cat.total.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-400 transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ MONTHLY TAB ══════════ */}
      {tab === 'monthly' && (
        <div className="space-y-4">
          {/* Month selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {MONTH_NAMES.map((m, i) => (
              <button key={i} onClick={() => setMonth(i + 1)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${month === i + 1 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                {m}
              </button>
            ))}
          </div>

          {/* Monthly summary card */}
          {budgets.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-5 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs opacity-70 mb-0.5">Presupuesto {MONTH_NAMES[month - 1]}</p>
                  <p className="text-3xl font-bold">${totalBudget.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70 mb-0.5">Gastado</p>
                  <p className={`text-3xl font-bold ${totalSpent > totalBudget ? 'text-red-300' : ''}`}>
                    ${totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs opacity-70 mb-1.5">
                  <span>{totalPct}% utilizado</span>
                  <span>Disponible: ${Math.max(0, totalBudget - totalSpent).toLocaleString()}</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${totalSpent > totalBudget ? 'bg-red-400' : totalPct >= 80 ? 'bg-amber-300' : 'bg-green-400'}`}
                    style={{ width: `${totalPct}%` }} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                {overCount > 0
                  ? <span className="text-xs bg-red-500/30 text-red-200 px-2 py-1 rounded-lg">⚠ {overCount} categoría{overCount > 1 ? 's' : ''} excedida{overCount > 1 ? 's' : ''}</span>
                  : <span className="text-xs bg-green-500/20 text-green-200 px-2 py-1 rounded-lg">✓ Dentro del presupuesto</span>}
                <span className="text-[10px] opacity-50">Act. {lastUpdate.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )}

          {/* Bar chart presupuesto vs real */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-gray-900 text-sm">Presupuestado vs Real</h2>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-200 inline-block" />Presupuesto</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />Real</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">🟢 OK &nbsp;🟡 &gt;80% &nbsp;🔴 Excedido · Se actualiza cada 30s</p>
              <BudgetChart data={chartData} />
            </div>
          )}

          {/* Add monthly budget form */}
          {showMonthlyForm && (
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Target size={16} className="text-indigo-500" /> Nuevo presupuesto mensual
              </h3>
              {/* Grouped category selector */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {Object.entries(catGroups).map(([group, cats]) => (
                  <div key={group}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{group}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {cats.map((c) => (
                        <button key={c.id} onClick={() => setSelCat(c.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${selCat === c.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100'}`}>
                          <span className="text-lg">{c.icon}</span>
                          <span className="text-[9px] text-gray-600 text-center leading-tight">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" placeholder="Límite mensual" value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full pl-6 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <button onClick={saveMonthlyBudget}
                  className="bg-indigo-600 text-white px-4 rounded-xl font-medium text-sm">
                  Guardar
                </button>
              </div>
            </div>
          )}

          {/* Monthly budget cards */}
          {budgets.length === 0 ? (
            <div className="text-center py-12">
              <Target size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Sin presupuestos para {MONTH_NAMES[month - 1]}</p>
              <button onClick={() => setShowMonthlyForm(true)} className="mt-2 text-indigo-600 text-sm font-medium">
                + Agregar presupuesto
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map((budget) => {
                const spent = spending.find((s) => s.id === budget.category_id)?.total || 0;
                const pct = Math.min(100, Math.round((spent / budget.limit_amount) * 100));
                const over = spent > budget.limit_amount;
                const remaining = budget.limit_amount - spent;
                return (
                  <div key={budget.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: budget.category_color + '20' }}>
                        {budget.category_icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{budget.category_name}</p>
                        <p className="text-xs text-gray-400">
                          ${spent.toLocaleString()} de ${budget.limit_amount.toLocaleString()}
                          {!over && <span className="text-green-500 ml-1">· ${remaining.toLocaleString()} disp.</span>}
                          {over && <span className="text-red-500 ml-1">· ${Math.abs(remaining).toLocaleString()} excedido</span>}
                        </p>
                      </div>
                      <span className={`text-sm font-bold px-2 py-1 rounded-lg shrink-0 ${over ? 'bg-red-50 text-red-600' : pct >= 80 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                        {pct}%
                      </span>
                      <button onClick={() => removeMonthlyBudget(budget.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
