'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, ChevronRight, X, Check, Trash2, Receipt } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import CompanySelector from '@/components/CompanySelector';
import SiiExpenseClassifier from '@/components/SiiExpenseClassifier';
import DisclaimerBanner from '@/components/DisclaimerBanner';

interface BizTx {
  id: number; type: 'income' | 'expense';
  gross_amount: number; net_amount: number; tax_amount: number;
  has_iva: number; description: string; date: string;
  document_type: string; category_id: number;
  category_name: string; category_icon: string; category_color: string;
}

interface BizCat {
  id: number; name: string; color: string; icon: string; type: string;
}

const IVA = 0.19;
const KEYS = ['7','8','9','4','5','6','1','2','3','.','0','DEL'];
const DOC_TYPES = ['boleta','factura','honorarios','sin_documento'];
const fmt = (n: number) => Math.abs(n).toLocaleString('es-CL', { maximumFractionDigits: 0 });

function calcAmounts(raw: number, hasIva: boolean, amountType: 'net' | 'gross') {
  if (!hasIva) return { net: raw, gross: raw, tax: 0 };
  if (amountType === 'gross') {
    const net  = raw / (1 + IVA);
    return { net, gross: raw, tax: raw - net };
  }
  return { net: raw, gross: raw * (1 + IVA), tax: raw * IVA };
}

// ── Shared Form ───────────────────────────────────────────────────────────────
function TxForm({
  initial, onSave, onDelete, onClose, title, companyGiro, companyActivityCategory,
}: {
  initial?: Partial<BizTx>;
  onSave: (data: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
  title: string;
  companyGiro?: string;
  companyActivityCategory?: string;
}) {
  const [type, setType]           = useState<'income' | 'expense'>(initial?.type ?? 'income');
  const [amount, setAmount]       = useState(initial ? String(initial.net_amount ?? '') : '');
  const [amtType, setAmtType]     = useState<'net' | 'gross'>('net');
  const [hasIva, setHasIva]       = useState(Boolean(initial?.has_iva));
  const [catId, setCatId]         = useState<number | null>(initial?.category_id ?? null);
  const [desc, setDesc]           = useState(initial?.description ?? '');
  const [date, setDate]           = useState(initial?.date ?? new Date().toISOString().split('T')[0]);
  const [docType, setDocType]     = useState(initial?.document_type ?? 'boleta');
  const [cats, setCats]           = useState<BizCat[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    fetch(`/api/business/transactions?categories=1&type=${type}`)
      .then((r) => r.json())
      .then((data: BizCat[]) => {
        setCats(data);
        if (!initial) setCatId(data[0]?.id ?? null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Auto-set doc_type based on IVA toggle
  useEffect(() => {
    if (hasIva && docType === 'boleta') setDocType('factura');
    if (!hasIva && docType === 'factura') setDocType('boleta');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIva]);

  const raw = parseFloat(amount) || 0;
  const { net, gross, tax } = calcAmounts(raw, hasIva, amtType);

  function handleKey(k: string) {
    if (k === 'DEL') { setAmount((a) => a.slice(0, -1) || ''); return; }
    if (k === '.' && amount.includes('.')) return;
    if (amount === '0' && k !== '.') { setAmount(k); return; }
    setAmount((a) => (a.length < 12 ? a + k : a));
  }

  async function handleSave() {
    if (!raw || !catId) return;
    setSaving(true);
    await onSave({ type, amount: raw, amount_type: amtType, has_iva: hasIva, category_id: catId, description: desc, date, document_type: docType });
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 700);
  }

  const accentColor = type === 'income' ? 'emerald' : 'red';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[93vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="font-bold text-lg text-gray-800">{title}</h2>
          <div className="flex gap-2">
            {onDelete && (
              <button onClick={onDelete} className="p-2 rounded-xl bg-red-50 text-red-400">
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 text-gray-500">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {/* Type */}
          <div className="flex bg-gray-100 rounded-2xl p-1">
            {(['income','expense'] as const).map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  type === t ? (t === 'income' ? 'bg-emerald-500 text-white shadow' : 'bg-red-500 text-white shadow') : 'text-gray-500'
                }`}
              >
                {t === 'income' ? '📈 Ingreso / Venta' : '📉 Gasto / Compra'}
              </button>
            ))}
          </div>

          {/* Amount display */}
          <div className={`rounded-2xl p-3 ${type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="text-center mb-2">
              <span className="text-gray-400 text-xl">$</span>
              <span className={`text-4xl font-bold ${type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                {amount || '0'}
              </span>
              <span className="text-xs text-gray-400 ml-2">{amtType === 'net' ? 'neto' : 'bruto'}</span>
            </div>
            {/* IVA toggle + amount type */}
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => setHasIva((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-semibold transition-all ${
                  hasIva ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-400'
                }`}
              >
                <Receipt size={12} /> {hasIva ? 'Con IVA (19%)' : 'Sin IVA'}
              </button>
              {hasIva && (
                <button
                  onClick={() => setAmtType((v) => v === 'net' ? 'gross' : 'net')}
                  className="text-gray-500 underline text-xs"
                >
                  Monto es {amtType === 'net' ? 'neto → cambiar a bruto' : 'bruto → cambiar a neto'}
                </button>
              )}
            </div>
            {hasIva && raw > 0 && (
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Neto (sin IVA)</span><span className="font-medium">${fmt(net)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA 19%</span><span className="font-medium text-amber-600">${fmt(tax)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total bruto</span><span>${fmt(gross)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button key={k} onClick={() => handleKey(k)}
                className={`py-3.5 rounded-2xl text-xl font-semibold active:scale-95 ${
                  k === 'DEL' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {k === 'DEL' ? '⌫' : k}
              </button>
            ))}
          </div>

          {/* Document type */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">Tipo documento</p>
            <div className="flex gap-2 flex-wrap">
              {DOC_TYPES.map((d) => (
                <button key={d} onClick={() => setDocType(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    docType === d ? `bg-${accentColor}-100 border-${accentColor}-300 text-${accentColor}-700` : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                  style={docType === d ? { backgroundColor: type === 'income' ? '#d1fae5' : '#fee2e2', borderColor: type === 'income' ? '#6ee7b7' : '#fca5a5', color: type === 'income' ? '#065f46' : '#991b1b' } : {}}
                >
                  {d === 'boleta' ? '🧾 Boleta' : d === 'factura' ? '📄 Factura' : d === 'honorarios' ? '📝 Honorarios' : '📋 Sin doc.'}
                </button>
              ))}
            </div>
          </div>

          {/* Description & date */}
          <div className="flex gap-2">
            <input type="text" placeholder="Descripción (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          {/* Categories */}
          {cats.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-2">Categoría</p>
              <div className="grid grid-cols-4 gap-2">
                {cats.map((cat) => (
                  <button key={cat.id} onClick={() => setCatId(cat.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      catId === cat.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[10px] text-gray-600 text-center leading-tight">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SII expense classifier — only for facturas de gasto */}
          {type === 'expense' && docType === 'factura' && (
            <SiiExpenseClassifier
              giro={companyGiro}
              activityCategory={companyActivityCategory}
              expenseCategoryName={cats.find((c) => c.id === catId)?.name}
            />
          )}

          {/* Save button */}
          <button onClick={handleSave} disabled={!raw || !catId || saving || saved}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-50 ${
              saved ? 'bg-green-500' : type === 'income' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {saved ? <span className="flex items-center justify-center gap-2"><Check size={18} /> Guardado</span>
              : saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BusinessTransactionsPage() {
  const { activeCompany } = useCompany();
  const [transactions, setTransactions] = useState<BizTx[]>([]);
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState<'all' | 'income' | 'expense'>('all');
  const [showNew, setShowNew]           = useState(false);
  const [editing, setEditing]           = useState<BizTx | null>(null);

  const load = useCallback(() => {
    if (!activeCompany) return;
    fetch(`/api/business/transactions?company_id=${activeCompany.id}`).then((r) => r.json()).then(setTransactions);
  }, [activeCompany]);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter((t) => {
    const matchType = filter === 'all' || t.type === filter;
    const matchSearch = !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category_name?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const grouped = filtered.reduce<Record<string, BizTx[]>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  async function handleNew(data: any) {
    await fetch('/api/business/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, company_id: activeCompany?.id }),
    });
    load();
  }

  async function handleEdit(data: any) {
    if (!editing) return;
    await fetch(`/api/business/transactions/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    load();
  }

  async function handleDelete() {
    if (!editing) return;
    await fetch(`/api/business/transactions/${editing.id}`, { method: 'DELETE' });
    setEditing(null);
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{
        background: activeCompany
          ? `linear-gradient(135deg, ${activeCompany.color}dd, ${activeCompany.color}99)`
          : 'linear-gradient(135deg, #10b981dd, #10b98199)'
      }}>
        <div className="flex items-center justify-between mb-3">
          {activeCompany ? <CompanySelector /> : <h1 className="text-white font-bold text-xl">Transacciones</h1>}
          <button onClick={() => setShowNew(true)}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center active:scale-95">
            <Plus size={20} className="text-white" />
          </button>
        </div>
        <p className="text-white/70 text-sm font-medium">Transacciones</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        {/* Filter */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(['all','income','expense'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
            >
              {f === 'all' ? 'Todos' : f === 'income' ? '📈 Ingresos' : '📉 Gastos'}
            </button>
          ))}
        </div>

        {transactions.length > 0 && (
          <p className="text-[11px] text-gray-400 text-center">Toca un registro para editarlo</p>
        )}

        <DisclaimerBanner />

        {/* List */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Sin transacciones registradas</p>
            <button onClick={() => setShowNew(true)} className="mt-3 text-emerald-600 text-sm font-medium">
              + Registrar primera transacción
            </button>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txs]) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-50">
                  {txs.map((t) => (
                    <button key={t.id} onClick={() => setEditing(t)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: (t.category_color || '#6b7280') + '20' }}>
                        {t.category_icon || '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.description || t.category_name}</p>
                        <p className="text-xs text-gray-400">
                          {t.category_name} · {t.document_type}{t.has_iva ? ' · IVA incl.' : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'}${fmt(t.net_amount)}
                        </p>
                        {t.has_iva && <p className="text-[10px] text-gray-400">+IVA ${fmt(t.tax_amount)}</p>}
                      </div>
                      <ChevronRight size={14} className="text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {/* New transaction modal */}
      {showNew && (
        <TxForm
          title="Nueva transacción"
          onSave={handleNew}
          onClose={() => setShowNew(false)}
          companyGiro={activeCompany?.giro}
          companyActivityCategory={activeCompany?.activity_category}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <TxForm
          title="Editar transacción"
          initial={editing}
          onSave={handleEdit}
          onDelete={handleDelete}
          onClose={() => setEditing(null)}
          companyGiro={activeCompany?.giro}
          companyActivityCategory={activeCompany?.activity_category}
        />
      )}
    </div>
  );
}
