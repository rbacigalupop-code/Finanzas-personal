'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Check, Pencil, Trash2, X } from 'lucide-react';
import { useCompany, Company } from '@/hooks/useCompany';
import { ACTIVITY_CATEGORIES } from '@/lib/sii-giros';

const LEGAL_TYPES = ['SPA', 'EIRL', 'SA', 'Ltda.', 'Persona Natural'];
const COLORS = ['#10b981','#3b82f6','#8b5cf6','#f97316','#ec4899','#ef4444','#eab308','#06b6d4'];
const ICONS  = ['🏢','🏭','🛍️','💼','🔧','🚀','🌿','🎨','📦','🍔','💻','🏗️'];

interface CompanyFormData {
  name: string; legal_type: string; rut: string; color: string; icon: string;
  giro: string; activity_category: string;
}

const emptyForm = (): CompanyFormData => ({
  name: '', legal_type: 'SPA', rut: '', color: '#10b981', icon: '🏢',
  giro: '', activity_category: '',
});

export default function CompanySelector() {
  const { companies, activeCompany, setActiveId, reload } = useCompany();
  const [open, setOpen]         = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [form, setForm]         = useState<CompanyFormData>(emptyForm());
  const [saving, setSaving]     = useState(false);

  function openNew() {
    setEditTarget(null);
    setForm(emptyForm());
    setShowForm(true);
    setOpen(false);
  }

  function openEdit(c: Company) {
    setEditTarget(c);
    setForm({
      name: c.name, legal_type: c.legal_type, rut: c.rut || '',
      color: c.color, icon: c.icon,
      giro: c.giro || '', activity_category: c.activity_category || '',
    });
    setShowForm(true);
    setOpen(false);
  }

  async function saveForm() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editTarget) {
      await fetch('/api/business/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...form }),
      });
    } else {
      const res  = await fetch('/api/business/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const { id } = await res.json();
      await reload();
      setActiveId(id);
      setSaving(false);
      setShowForm(false);
      return;
    }
    await reload();
    setSaving(false);
    setShowForm(false);
  }

  async function deleteCompany(id: number) {
    if (!confirm('¿Eliminar esta empresa y todos sus datos?')) return;
    await fetch(`/api/business/companies?id=${id}`, { method: 'DELETE' });
    await reload();
    setShowForm(false);
  }

  if (!activeCompany) return null;

  return (
    <>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 transition-colors"
      >
        <span className="text-lg leading-none">{activeCompany.icon}</span>
        <div className="text-left">
          <p className="text-white font-semibold text-sm leading-tight">{activeCompany.name}</p>
          <p className="text-white/60 text-[10px]">{activeCompany.legal_type}</p>
        </div>
        <ChevronDown size={14} className="text-white/70 ml-1" />
      </button>

      {/* Dropdown sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-base">Mis empresas</h3>
              <button onClick={() => setOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-2 mb-4">
              {companies.map((c) => (
                <div key={c.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                  c.id === activeCompany.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50'
                }`}>
                  <button className="flex-1 flex items-center gap-3 text-left" onClick={() => { setActiveId(c.id); setOpen(false); }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: c.color + '25' }}>
                      {c.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.legal_type}{c.rut ? ` · ${c.rut}` : ''}</p>
                      {c.giro && <p className="text-[10px] text-emerald-600 truncate">{c.giro}</p>}
                    </div>
                    {c.id === activeCompany.id && <Check size={16} className="text-emerald-500 ml-auto" />}
                  </button>
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-300 hover:text-indigo-400 transition-colors">
                    <Pencil size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={openNew}
              className="w-full py-3 border-2 border-dashed border-emerald-200 rounded-2xl text-emerald-500 text-sm font-semibold flex items-center justify-center gap-2 hover:border-emerald-400 transition-colors"
            >
              <Plus size={16} /> Agregar empresa
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-base">
                {editTarget ? 'Editar empresa' : 'Nueva empresa'}
              </h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-4">
              {/* Icon */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Ícono</p>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ic) => (
                    <button key={ic} onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                      className={`text-2xl p-2 rounded-xl border-2 transition-all ${form.icon === ic ? 'border-emerald-400 bg-emerald-50' : 'border-transparent hover:border-gray-200'}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((col) => (
                    <button key={col} onClick={() => setForm((f) => ({ ...f, color: col }))}
                      className={`w-8 h-8 rounded-full border-4 transition-all ${form.color === col ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Nombre de la empresa *</label>
                <input
                  type="text"
                  placeholder="Ej: Consultora Patagonia"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* Legal type */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-2 block">Tipo legal</label>
                <div className="flex flex-wrap gap-2">
                  {LEGAL_TYPES.map((lt) => (
                    <button key={lt} onClick={() => setForm((f) => ({ ...f, legal_type: lt }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        form.legal_type === lt
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {lt}
                    </button>
                  ))}
                </div>
              </div>

              {/* RUT */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">RUT (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 76.123.456-7"
                  value={form.rut}
                  onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* Giro */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  Giro / Actividad (opcional)
                  <span className="ml-1 text-emerald-500 font-normal">— mejora el clasificador SII</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Desarrollo de software, Comercio retail, Restaurante"
                  value={form.giro}
                  onChange={(e) => setForm((f) => ({ ...f, giro: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* Activity category */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-2 block">
                  Categoría SII
                  <span className="ml-1 text-gray-400 font-normal">(para orientación tributaria por giro)</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ACTIVITY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setForm((f) => ({
                        ...f,
                        activity_category: f.activity_category === cat.id ? '' : cat.id,
                      }))}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all ${
                        form.activity_category === cat.id
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm shrink-0">{cat.icon}</span>
                      <span className="text-[10px] font-medium leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
                {form.activity_category && (
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {ACTIVITY_CATEGORIES.find((c) => c.id === form.activity_category)?.desc}
                  </p>
                )}
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: form.color + '25' }}>
                  {form.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate">{form.name || 'Nombre empresa'}</p>
                  <p className="text-xs text-gray-400">{form.legal_type}{form.rut ? ` · ${form.rut}` : ''}</p>
                  {form.giro && <p className="text-[10px] text-emerald-600 truncate">{form.giro}</p>}
                  {form.activity_category && (
                    <p className="text-[10px] text-gray-400">
                      {ACTIVITY_CATEGORIES.find((c) => c.id === form.activity_category)?.icon}{' '}
                      {ACTIVITY_CATEGORIES.find((c) => c.id === form.activity_category)?.label}
                    </p>
                  )}
                </div>
              </div>

              <button onClick={saveForm} disabled={!form.name.trim() || saving}
                className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} /> {saving ? 'Guardando...' : editTarget ? 'Guardar cambios' : 'Crear empresa'}
              </button>

              {editTarget && companies.length > 1 && (
                <button onClick={() => deleteCompany(editTarget.id)}
                  className="w-full text-red-400 text-sm font-medium py-2 flex items-center justify-center gap-2 hover:text-red-600"
                >
                  <Trash2 size={14} /> Eliminar empresa
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
