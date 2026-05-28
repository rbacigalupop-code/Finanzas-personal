'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus, Trash2, Shield, User, Lock, Eye, EyeOff,
  Loader2, ChevronLeft, Users,
} from 'lucide-react';

interface AppUser {
  id:           number;
  username:     string;
  display_name: string;
  is_admin:     number;
  created_at:   string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users,   setUsers]   = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // New user form
  const [showForm,    setShowForm]    = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName,     setNewName]     = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [formError,   setFormError]   = useState('');

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId,  setConfirmId]  = useState<number | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const r = await fetch('/api/settings/users');
      if (r.status === 403) { router.push('/'); return; }
      setUsers(await r.json());
    } catch {
      setError('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      const res = await fetch('/api/settings/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: newUsername, displayName: newName, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Error'); return; }
      setNewUsername(''); setNewName(''); setNewPassword('');
      setShowForm(false);
      await loadUsers();
    } catch {
      setFormError('Error de conexión');
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(id: number) {
    setDeletingId(id);
    try {
      await fetch(`/api/settings/users?id=${id}`, { method: 'DELETE' });
      setConfirmId(null);
      await loadUsers();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-indigo-600 text-sm mb-3"
          >
            <ChevronLeft size={18} /> Volver
          </button>
          <div className="flex items-center gap-2">
            <Users size={22} className="text-indigo-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Gestión de usuarios</h1>
              <p className="text-xs text-gray-500">Solo administradores pueden acceder</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {error && (
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* User list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Usuarios registrados</p>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {users.length}
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {users.map((u) => (
                <li key={u.id} className="px-4 py-3 flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    u.is_admin === 1
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.display_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.display_name}</p>
                      {u.is_admin === 1 && (
                        <span className="flex-shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                          <Shield size={9} /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </div>

                  {/* Delete */}
                  {u.is_admin !== 1 && (
                    confirmId === u.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
                        <button
                          onClick={() => deleteUser(u.id)}
                          disabled={deletingId === u.id}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg font-medium disabled:opacity-50"
                        >
                          {deletingId === u.id ? <Loader2 size={12} className="animate-spin" /> : 'Sí'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs text-gray-500 px-2 py-1 rounded-lg"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(u.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add user form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-2xl text-sm font-semibold shadow-md shadow-indigo-200 active:scale-95 transition-transform"
          >
            <UserPlus size={18} />
            Agregar usuario
          </button>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-emerald-50">
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                <UserPlus size={15} /> Nuevo usuario
              </p>
            </div>
            <form onSubmit={createUser} className="px-4 py-4 space-y-3">
              {/* Display name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nombre de la persona"
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Usuario (para login)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="ej: maria"
                    required
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña temporal</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full pl-8 pr-10 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">El usuario podrá cambiarla más adelante.</p>
              </div>

              {formError && (
                <div className="bg-red-50 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600">{formError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormError(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {creating ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info note */}
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>💡 Cada usuario</strong> tiene su propio espacio de datos independiente — transacciones, presupuestos, deudas y empresas no se comparten entre usuarios.
          </p>
        </div>
      </div>
    </div>
  );
}
