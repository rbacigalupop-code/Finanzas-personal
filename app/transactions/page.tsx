'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Search } from 'lucide-react';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category_name: string;
  category_icon: string;
  category_color: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const load = () => {
    fetch('/api/transactions?limit=100').then((r) => r.json()).then(setTransactions);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: number) => {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const filtered = transactions.filter((t) => {
    const matchType = filter === 'all' || t.type === filter;
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category_name?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const key = t.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
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
          placeholder="Buscar..."
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
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
          >
            {f === 'all' ? 'Todos' : f === 'expense' ? '💸 Gastos' : '💰 Ingresos'}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Sin movimientos</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, txs]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-50">
              {txs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: t.category_color + '20' }}>
                    {t.category_icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.description || t.category_name}</p>
                    <p className="text-xs text-gray-400">{t.category_name}</p>
                  </div>
                  <span className={`text-sm font-bold mr-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                  </span>
                  <button onClick={() => remove(t.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
