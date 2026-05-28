'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  type: 'income' | 'expense';
}

export default function TransactionForm() {
  const router = useRouter();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/categories?type=${type}`)
      .then((r) => r.json())
      .then((data: Category[]) => {
        setCategories(data);
        setCategoryId(data[0]?.id || null);
      });
  }, [type]);

  const handleNumber = (digit: string) => {
    if (digit === '.' && amount.includes('.')) return;
    if (digit === 'DEL') { setAmount((a) => a.slice(0, -1)); return; }
    if (amount === '0' && digit !== '.') { setAmount(digit); return; }
    setAmount((a) => (a.length < 12 ? a + digit : a));
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0 || !categoryId) return;
    setSaving(true);
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount: parseFloat(amount), category_id: categoryId, description, date }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 800);
  };

  const keys = ['7','8','9','4','5','6','1','2','3','.','0','DEL'];

  return (
    <div className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1">
        {(['expense','income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              type === t
                ? t === 'expense' ? 'bg-red-500 text-white shadow' : 'bg-green-500 text-white shadow'
                : 'text-gray-500'
            }`}
          >
            {t === 'expense' ? '💸 Gasto' : '💰 Ingreso'}
          </button>
        ))}
      </div>

      {/* Amount display */}
      <div className={`text-center py-4 rounded-2xl ${type === 'expense' ? 'bg-red-50' : 'bg-green-50'}`}>
        <span className="text-gray-400 text-2xl">$</span>
        <span className={`text-5xl font-bold ${type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
          {amount || '0'}
        </span>
      </div>

      {/* Category selector */}
      <div className="grid grid-cols-4 gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryId(cat.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
              categoryId === cat.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="text-[10px] text-gray-600 text-center leading-tight">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Description & date */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => handleNumber(k)}
            className={`py-4 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
              k === 'DEL' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {k === 'DEL' ? '⌫' : k}
          </button>
        ))}
      </div>

      {/* Save button */}
      <button
        onClick={handleSubmit}
        disabled={!amount || parseFloat(amount) <= 0 || saving || saved}
        className={`py-4 rounded-2xl font-bold text-white text-lg transition-all active:scale-95 disabled:opacity-50 ${
          saved ? 'bg-green-500' : type === 'expense' ? 'bg-red-500' : 'bg-green-500'
        }`}
      >
        {saved ? <span className="flex items-center justify-center gap-2"><CheckCircle size={20} /> Guardado</span>
          : saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );
}
