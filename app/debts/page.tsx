'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, Plus, Trash2, TrendingDown, Calendar,
  ChevronDown, ChevronUp, DollarSign, RefreshCw, X, Check,
  Zap, Target, AlertCircle, ToggleLeft, ToggleRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Debt {
  id: number;
  name: string;
  total_amount: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_day?: number;
  color: string;
  icon: string;
  total_paid: number;
}

interface Recurring {
  id: number;
  name: string;
  amount: number;
  category_id?: number;
  day_of_month: number;
  color: string;
  icon: string;
  is_active: number;
  category_name?: string;
}

interface PayoffMonth {
  month: number;
  label: string;
  payments: { name: string; amount: number; isExtra: boolean }[];
  totalPaid: number;
  remainingTotal: number;
}

// ─── Strategy Calculator ──────────────────────────────────────────────────────

function calcPayoffPlan(debts: Debt[], extraMonthly: number, strategy: 'avalanche' | 'snowball'): PayoffMonth[] {
  if (!debts.length) return [];

  // Deep copy balances
  const balances = debts.map((d) => ({ ...d, bal: d.current_balance }));

  // Sort by strategy
  const sorted = [...balances].sort((a, b) =>
    strategy === 'avalanche'
      ? b.interest_rate - a.interest_rate
      : a.bal - b.bal
  );

  const months: PayoffMonth[] = [];
  const now = new Date();
  let month = 0;

  while (sorted.some((d) => d.bal > 0) && month < 120) {
    month++;
    const date = new Date(now.getFullYear(), now.getMonth() + month, 1);
    const label = date.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });

    let extraLeft = extraMonthly;
    const payments: { name: string; amount: number; isExtra: boolean }[] = [];
    let monthTotal = 0;

    // Apply interest + minimum payments
    for (const d of sorted) {
      if (d.bal <= 0) continue;
      d.bal += d.bal * (d.interest_rate / 100 / 12);
      const minPay = Math.min(d.minimum_payment, d.bal);
      d.bal = Math.max(0, d.bal - minPay);
      payments.push({ name: d.name, amount: minPay, isExtra: false });
      monthTotal += minPay;
    }

    // Apply extra to focus debt
    for (const d of sorted) {
      if (d.bal <= 0 || extraLeft <= 0) continue;
      const extra = Math.min(extraLeft, d.bal);
      d.bal = Math.max(0, d.bal - extra);
      const existing = payments.find((p) => p.name === d.name);
      if (existing) existing.amount += extra;
      else payments.push({ name: d.name, amount: extra, isExtra: true });
      monthTotal += extra;
      extraLeft -= extra;
      if (d.bal === 0 && extraLeft > 0) continue; // roll over to next
    }

    months.push({
      month,
      label,
      payments,
      totalPaid: monthTotal,
      remainingTotal: sorted.reduce((s, d) => s + Math.max(0, d.bal), 0),
    });
  }

  return months;
}

// ─── Debt Card ────────────────────────────────────────────────────────────────

function DebtCard({
  debt, onDelete, onPayment,
}: {
  debt: Debt;
  onDelete: (id: number) => void;
  onPayment: (debt: Debt) => void;
}) {
  const pct = debt.total_amount > 0
    ? Math.min(100, ((debt.total_amount - debt.current_balance) / debt.total_amount) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{debt.icon}</span>
          <div>
            <p className="font-semibold text-gray-800">{debt.name}</p>
            <p className="text-xs text-gray-400">
              {debt.interest_rate > 0 ? `${debt.interest_rate}% anual` : 'Sin interés'}
              {debt.due_day ? ` · Vence día ${debt.due_day}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onPayment(debt)}
            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
          >
            <DollarSign size={15} />
          </button>
          <button
            onClick={() => onDelete(debt.id)}
            className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-500">Saldo pendiente</span>
        <span className="font-bold text-red-500">
          ${debt.current_balance.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>Total original: ${debt.total_amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
        <span>Pagado: ${(debt.total_amount - debt.current_balance).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: debt.color }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{pct.toFixed(0)}% pagado</span>
        {debt.minimum_payment > 0 && (
          <span className="text-gray-400">
            Cuota mínima: ${debt.minimum_payment.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DebtsPage() {
  const [tab, setTab] = useState<'debts' | 'recurring' | 'strategy'>('debts');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<Debt | null>(null);

  // Strategy
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraBudget, setExtraBudget] = useState('');
  const [plan, setPlan] = useState<PayoffMonth[]>([]);
  const [showPlanMonths, setShowPlanMonths] = useState(6);

  // New debt form
  const [dName, setDName] = useState('');
  const [dTotal, setDTotal] = useState('');
  const [dBalance, setDBalance] = useState('');
  const [dRate, setDRate] = useState('');
  const [dMin, setDMin] = useState('');
  const [dDue, setDDue] = useState('');
  const [dColor, setDColor] = useState('#ef4444');
  const [dIcon, setDIcon] = useState('💳');

  // New recurring form
  const [rName, setRName] = useState('');
  const [rAmount, setRAmount] = useState('');
  const [rDay, setRDay] = useState('1');
  const [rColor, setRColor] = useState('#6366f1');
  const [rIcon, setRIcon] = useState('🔄');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [dRes, rRes] = await Promise.all([
      fetch('/api/debts').then((r) => r.json()),
      fetch('/api/recurring').then((r) => r.json()),
    ]);
    setDebts(dRes);
    setRecurring(rRes);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (debts.length && extraBudget) {
      const plan = calcPayoffPlan(debts, Number(extraBudget), strategy);
      setPlan(plan);
    } else {
      setPlan([]);
    }
  }, [debts, extraBudget, strategy]);

  async function addDebt() {
    if (!dName || !dTotal || !dBalance) return;
    await fetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: dName, total_amount: Number(dTotal), current_balance: Number(dBalance),
        interest_rate: Number(dRate || 0), minimum_payment: Number(dMin || 0),
        due_day: dDue ? Number(dDue) : undefined, color: dColor, icon: dIcon,
      }),
    });
    setDName(''); setDTotal(''); setDBalance(''); setDRate(''); setDMin(''); setDDue('');
    setShowDebtForm(false);
    loadData();
  }

  async function deleteDebt(id: number) {
    if (!confirm('¿Eliminar esta deuda?')) return;
    await fetch(`/api/debts?id=${id}`, { method: 'DELETE' });
    loadData();
  }

  async function submitPayment() {
    if (!showPaymentForm || !payAmount) return;
    await fetch('/api/debts/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        debt_id: showPaymentForm.id, amount: Number(payAmount),
        date: payDate, note: payNote,
      }),
    });
    setPayAmount(''); setPayNote('');
    setShowPaymentForm(null);
    loadData();
  }

  async function addRecurring() {
    if (!rName || !rAmount || !rDay) return;
    await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: rName, amount: Number(rAmount),
        day_of_month: Number(rDay), color: rColor, icon: rIcon,
      }),
    });
    setRName(''); setRAmount(''); setRDay('1');
    setShowRecurringForm(false);
    loadData();
  }

  async function toggleRecurring(r: Recurring) {
    await fetch('/api/recurring', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, is_active: r.is_active ? 0 : 1 }),
    });
    loadData();
  }

  async function deleteRecurring(id: number) {
    if (!confirm('¿Eliminar este gasto fijo?')) return;
    await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' });
    loadData();
  }

  const totalDebt = debts.reduce((s, d) => s + d.current_balance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.minimum_payment, 0);
  const totalRecurring = recurring.filter((r) => r.is_active).reduce((s, r) => s + r.amount, 0);
  const monthsToPayoff = plan.length;

  const DEBT_ICONS = ['💳', '🏠', '🚗', '📱', '🎓', '💊', '🏦', '💼', '🛍️', '⚡'];
  const DEBT_COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e', '#ec4899'];
  const RECURRING_ICONS = ['📱', '🎬', '🎵', '🌐', '💡', '🚿', '🏋️', '📺', '🎮', '☁️', '🔄', '📦'];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-500 to-rose-600 px-4 pt-12 pb-6">
        <h1 className="text-white font-bold text-xl mb-4">Deudas & Gastos Fijos</h1>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-white/80 text-[10px] font-medium">Deuda total</p>
            <p className="text-white font-bold text-sm">
              ${totalDebt.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-white/80 text-[10px] font-medium">Cuotas/mes</p>
            <p className="text-white font-bold text-sm">
              ${totalMinPayment.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-white/80 text-[10px] font-medium">Fijos/mes</p>
            <p className="text-white font-bold text-sm">
              ${totalRecurring.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 px-4 gap-1 sticky top-0 z-10">
        {(['debts', 'recurring', 'strategy'] as const).map((t) => {
          const labels = { debts: 'Deudas', recurring: 'Gastos Fijos', strategy: 'Plan de Pago' };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : (

          /* ── DEBTS TAB ──────────────────────────────────────────── */
          tab === 'debts' ? (
            <div className="space-y-3">
              {debts.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 text-sm">Sin deudas registradas</p>
                  <p className="text-gray-300 text-xs mt-1">¡Agrega tus deudas para planificar tu pago!</p>
                </div>
              ) : (
                debts.map((d) => (
                  <DebtCard key={d.id} debt={d} onDelete={deleteDebt} onPayment={setShowPaymentForm} />
                ))
              )}

              {/* Add Debt Button */}
              <button
                onClick={() => setShowDebtForm(true)}
                className="w-full py-3 border-2 border-dashed border-red-200 rounded-2xl text-red-400 text-sm font-medium hover:border-red-400 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Agregar deuda
              </button>
            </div>

          /* ── RECURRING TAB ──────────────────────────────────────── */
          ) : tab === 'recurring' ? (
            <div className="space-y-3">
              {recurring.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 text-sm">Sin gastos fijos registrados</p>
                  <p className="text-gray-300 text-xs mt-1">Plan celular, Netflix, gym…</p>
                </div>
              ) : (
                recurring.map((r) => (
                  <div
                    key={r.id}
                    className={`bg-white rounded-2xl shadow-sm p-4 border border-gray-100 ${!r.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: r.color + '20' }}
                        >
                          {r.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
                          <p className="text-xs text-gray-400">
                            Día {r.day_of_month} de cada mes
                            {r.category_name ? ` · ${r.category_name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 text-sm">
                          ${r.amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </p>
                        <button onClick={() => toggleRecurring(r)} className="text-gray-400 hover:text-indigo-500 transition-colors">
                          {r.is_active ? <ToggleRight size={22} className="text-indigo-500" /> : <ToggleLeft size={22} />}
                        </button>
                        <button onClick={() => deleteRecurring(r.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Total */}
              {recurring.length > 0 && (
                <div className="bg-indigo-50 rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-indigo-700 font-medium text-sm">Total mensual activo</span>
                  <span className="font-bold text-indigo-700">
                    ${totalRecurring.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowRecurringForm(true)}
                className="w-full py-3 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-400 text-sm font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Agregar gasto fijo
              </button>
            </div>

          /* ── STRATEGY TAB ──────────────────────────────────────── */
          ) : (
            <div className="space-y-4">
              {debts.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingDown size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 text-sm">Agrega deudas primero para ver el plan de pago</p>
                </div>
              ) : (
                <>
                  {/* Strategy selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setStrategy('avalanche')}
                      className={`rounded-2xl p-4 border-2 text-left transition-all ${
                        strategy === 'avalanche'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={16} className={strategy === 'avalanche' ? 'text-red-500' : 'text-gray-400'} />
                        <span className={`font-bold text-sm ${strategy === 'avalanche' ? 'text-red-600' : 'text-gray-600'}`}>
                          Avalancha
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Mayor tasa primero. Ahorra más en intereses.</p>
                    </button>
                    <button
                      onClick={() => setStrategy('snowball')}
                      className={`rounded-2xl p-4 border-2 text-left transition-all ${
                        strategy === 'snowball'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={16} className={strategy === 'snowball' ? 'text-blue-500' : 'text-gray-400'} />
                        <span className={`font-bold text-sm ${strategy === 'snowball' ? 'text-blue-600' : 'text-gray-600'}`}>
                          Bola de nieve
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Menor saldo primero. Más motivación.</p>
                    </button>
                  </div>

                  {/* Extra budget input */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💰 ¿Cuánto extra puedes destinar al pago de deudas cada mes?
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={extraBudget}
                        onChange={(e) => setExtraBudget(e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Cuotas mínimas: ${totalMinPayment.toLocaleString('es-CL', { maximumFractionDigits: 0 })}/mes
                    </p>
                  </div>

                  {/* Plan results */}
                  {plan.length > 0 ? (
                    <div className="space-y-3">
                      {/* Summary card */}
                      <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-4 text-white">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar size={16} />
                          <span className="font-semibold text-sm">Plan {strategy === 'avalanche' ? 'Avalancha' : 'Bola de Nieve'}</span>
                        </div>
                        <p className="text-3xl font-bold mb-1">{monthsToPayoff} meses</p>
                        <p className="text-white/80 text-xs">
                          hasta quedar libre de deudas · libre en {plan[monthsToPayoff - 1]?.label}
                        </p>
                      </div>

                      {/* Debt order */}
                      <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                          Orden de pago ({strategy === 'avalanche' ? 'mayor interés primero' : 'menor saldo primero'})
                        </p>
                        {debts
                          .slice()
                          .sort((a, b) =>
                            strategy === 'avalanche'
                              ? b.interest_rate - a.interest_rate
                              : a.current_balance - b.current_balance
                          )
                          .map((d, i) => (
                            <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: d.color }}
                              >
                                {i + 1}
                              </div>
                              <span className="text-sm text-gray-700 flex-1">{d.name}</span>
                              <span className="text-xs text-gray-400">
                                {strategy === 'avalanche'
                                  ? `${d.interest_rate}% anual`
                                  : `$${d.current_balance.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                                }
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* Month-by-month schedule */}
                      <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Calendario de pago</p>
                        <div className="space-y-2">
                          {plan.slice(0, showPlanMonths).map((m) => (
                            <div key={m.month} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                              <span className="text-gray-600 font-medium w-12">{m.label}</span>
                              <div className="flex-1 mx-3">
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-gradient-to-r from-red-400 to-rose-500"
                                    style={{
                                      width: `${Math.min(100, (1 - m.remainingTotal / totalDebt) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-gray-400 w-24 text-right">
                                Resta: ${m.remainingTotal.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ))}
                        </div>
                        {plan.length > showPlanMonths && (
                          <button
                            onClick={() => setShowPlanMonths((n) => n + 6)}
                            className="w-full text-center text-xs text-red-500 font-medium mt-3 hover:text-red-700"
                          >
                            Ver {Math.min(6, plan.length - showPlanMonths)} meses más ↓
                          </button>
                        )}
                      </div>

                      {/* Tip */}
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <div className="flex gap-2">
                          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-amber-700 mb-1">💡 Consejo financiero</p>
                            <p className="text-xs text-amber-600">
                              {strategy === 'avalanche'
                                ? 'La estrategia Avalancha minimiza el total de intereses pagados. Es la más eficiente matemáticamente para salir de deudas.'
                                : 'La estrategia Bola de Nieve te da victorias rápidas al liquidar deudas pequeñas primero, lo que mantiene la motivación alta.'}
                              {' '}Mantén las cuotas mínimas de todas las deudas y enfoca el dinero extra en la deuda prioritaria.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : extraBudget ? (
                    <p className="text-center text-gray-400 text-sm py-4">Calculando plan...</p>
                  ) : (
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <TrendingDown size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400 text-sm">Ingresa cuánto extra puedes pagar al mes para ver tu plan personalizado</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        )}
      </div>

      {/* ── Modal: Add Debt ── */}
      {showDebtForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-gray-800">Nueva Deuda</h2>
              <button onClick={() => setShowDebtForm(false)}>
                <X size={22} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Icon selector */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Ícono</label>
                <div className="flex gap-2 flex-wrap">
                  {DEBT_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setDIcon(ic)}
                      className={`text-xl p-1.5 rounded-lg border-2 transition-all ${dIcon === ic ? 'border-red-400' : 'border-transparent'}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {DEBT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDColor(c)}
                      className={`w-8 h-8 rounded-full border-4 transition-all ${dColor === c ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <input
                placeholder="Nombre (ej: Tarjeta Visa)"
                value={dName}
                onChange={(e) => setDName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Monto original</label>
                  <input
                    type="number" placeholder="0" value={dTotal}
                    onChange={(e) => setDTotal(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Saldo actual</label>
                  <input
                    type="number" placeholder="0" value={dBalance}
                    onChange={(e) => setDBalance(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tasa anual (%)</label>
                  <input
                    type="number" placeholder="0" value={dRate}
                    onChange={(e) => setDRate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cuota mínima</label>
                  <input
                    type="number" placeholder="0" value={dMin}
                    onChange={(e) => setDMin(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Día de vencimiento (opcional)</label>
                <input
                  type="number" placeholder="15" value={dDue} min={1} max={31}
                  onChange={(e) => setDDue(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <button
                onClick={addDebt}
                className="w-full bg-red-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
              >
                <Check size={16} /> Guardar deuda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Register Payment ── */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-gray-800">Registrar Pago</h2>
              <button onClick={() => setShowPaymentForm(null)}>
                <X size={22} className="text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Deuda: <strong>{showPaymentForm.name}</strong> · Saldo: ${showPaymentForm.current_balance.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto pagado</label>
                <input
                  type="number" placeholder="0" value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                <input
                  type="date" value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <input
                placeholder="Nota (opcional)" value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                onClick={submitPayment}
                className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
              >
                <Check size={16} /> Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Recurring ── */}
      {showRecurringForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-gray-800">Nuevo Gasto Fijo</h2>
              <button onClick={() => setShowRecurringForm(false)}>
                <X size={22} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Icon */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Ícono</label>
                <div className="flex gap-2 flex-wrap">
                  {RECURRING_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setRIcon(ic)}
                      className={`text-xl p-1.5 rounded-lg border-2 transition-all ${rIcon === ic ? 'border-indigo-400' : 'border-transparent'}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <input
                placeholder="Nombre (ej: Plan celular Entel)"
                value={rName}
                onChange={(e) => setRName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Monto mensual</label>
                  <input
                    type="number" placeholder="0" value={rAmount}
                    onChange={(e) => setRAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Día de cobro</label>
                  <input
                    type="number" placeholder="1" min={1} max={31} value={rDay}
                    onChange={(e) => setRDay(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <button
                onClick={addRecurring}
                className="w-full bg-indigo-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors"
              >
                <Check size={16} /> Guardar gasto fijo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
