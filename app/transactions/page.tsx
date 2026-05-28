'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Search, X, Check, ChevronRight } from 'lucide-react';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  type: 'income' | 'expense';
}

const KEYS = ['7','8','9','4','5','6','1','2','3','.','0','DEL'];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Edit modal state
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategories, setEditCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    fetch('/api/transactions?limit=200').then((r) => r.json()).then(setTransactions);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load categories when type changes in edit modal
  useEffect(() => {
    if (!editing) return;
    fetch(`/api/categories?type=${editType}`)
      .then((r) => r.json())
      .then((cats: Category[]) => {
        setEditCategories(cats);
        // Keep current category if it matches new type, otherwise pick first
        const stillValid = cats.find((c) => c.id === editCategoryId);
        if (!stillValid) setEditCategoryId(cats[0]?.id ?? null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editType, editing]);

  function openEdit(t: Transaction) {
    setEditing(t);
    setEditType(t.type);
    setEditAmount(String(t.amount));
    setEditCategoryId(t.category_id);
    setEditDescription(t.description || '');
    setEditDate(t.date);
    setSaved(false);
  }

  function closeEdit() {
    setEditing(null);
    setSaved(false);
  }

  function handleKey(digit: string) {
    if (digit === 'DEL') { setEditAmount((a) => a.slice(0, -1) || ''); return; }
    if (digit === '.' && editAmount.includes('.')) return;
    if (editAmount === '0' && digit !== '.') { setEditAmount(digit); return; }
    setEditAmount((a) => (a.length < 12 ? a + digit : a));
  }

  async function saveEdit() {
    if (!editing || !editAmount || parseFloat(editAmount) <= 0 || !editCategoryId) return;
    setSaving(true);
    await fetch(`/api/transactions/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: editType,
        amount: parseFloat(editAmount),
        category_id: editCategoryId,
        description: editDescription,
        date: editDate,
      }),
    });
    setSaving(false);
    setSaved(true);
    load();
    setTimeout(() => closeEdit(), 700);
  }

  async function remove(id: number) {
    closeEdit();
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const filtered = transactions.filter((t) => {
    const matchType = filter === 'all' || t.type === filter;
    const matchSearch =
      !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category_name?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
        <Link href="/transactions/new">
          <button className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por descripción o categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(['all','expense','income'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === f ? 'bg-white shadow text-indigo-600' : 'text-gray-500'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'expense' ? '💸 Gastos' : '💰 Ingresos'}
          </button>
        ))}
      </div>

      {/* Hint */}
      {transactions.length > 0 && (
        <p className="text-[11px] text-gray-400 text-center">
          Toca cualquier movimiento para editarlo
        </p>
      )}

      {/* Grouped list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Sin movimientos</p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, txs]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {new Date(date + 'T12:00:00').toLocaleDateString('es-CL', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </p>
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-50">
                {txs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openEdit(t)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: t.category_color + '20' }}
                    >
                      {t.category_icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {t.description || t.category_name}
                      </p>
                      <p className="text-xs text-gray-400">{t.category_name}</p>
                    </div>
                    <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('es-CL')}
                    </span>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))
      )}

      {/* ── Edit Bottom Sheet ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={closeEdit} />

          <div className="relative bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-bold text-lg text-gray-800">Editar movimiento</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => remove(editing.id)}
                  className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={17} />
                </button>
                <button onClick={closeEdit} className="p-2 rounded-xl bg-gray-100 text-gray-500">
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* Type toggle */}
              <div className="flex bg-gray-100 rounded-2xl p-1">
                {(['expense','income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      editType === t
                        ? t === 'expense' ? 'bg-red-500 text-white shadow' : 'bg-green-500 text-white shadow'
                        : 'text-gray-500'
                    }`}
                  >
                    {t === 'expense' ? '💸 Gasto' : '💰 Ingreso'}
                  </button>
                ))}
              </div>

              {/* Amount display */}
              <div className={`text-center py-3 rounded-2xl ${editType === 'expense' ? 'bg-red-50' : 'bg-green-50'}`}>
                <span className="text-gray-400 text-xl">$</span>
                <span className={`text-4xl font-bold ${editType === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                  {editAmount || '0'}
                </span>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => handleKey(k)}
                    className={`py-3.5 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                      k === 'DEL' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {k === 'DEL' ? '⌫' : k}
                  </button>
                ))}
              </div>

              {/* Description & date */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {/* Category selector */}
              {editCategories.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">Categoría</p>
                  <div className="grid grid-cols-4 gap-2">
                    {editCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setEditCategoryId(cat.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                          editCategoryId === cat.id
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-[10px] text-gray-600 text-center leading-tight">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Save button */}
              <button
                onClick={saveEdit}
                disabled={!editAmount || parseFloat(editAmount) <= 0 || saving || saved}
                className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-50 ${
                  saved ? 'bg-green-500' : editType === 'expense' ? 'bg-red-500' : 'bg-green-500'
                }`}
              >
                {saved ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check size={18} /> Guardado
                  </span>
                ) : saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
