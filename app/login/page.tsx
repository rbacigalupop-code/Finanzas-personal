'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

type Mode = 'loading' | 'setup' | 'login';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('loading');

  // Form fields
  const [username,    setUsername]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  // Determine setup vs login
  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setMode(d.hasUsers ? 'login' : 'setup'))
      .catch(() => setMode('login'));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const endpoint = mode === 'setup' ? '/api/auth/setup' : '/api/auth/login';
      const body = mode === 'setup'
        ? { username, displayName, password }
        : { username, password };

      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error desconocido');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  const isSetup = mode === 'setup';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-5">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
          <span className="text-2xl">💰</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">FinanceTracker</h1>
        <p className="text-sm text-gray-500 mt-1">Control de gastos personal</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 ${isSetup ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-indigo-50 border-b border-indigo-100'}`}>
          <div className="flex items-center gap-2">
            {isSetup
              ? <ShieldCheck size={18} className="text-emerald-600" />
              : <Lock        size={18} className="text-indigo-600" />
            }
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {isSetup ? 'Crear cuenta administrador' : 'Iniciar sesión'}
              </p>
              <p className="text-xs text-gray-500">
                {isSetup
                  ? 'Primera vez — crea la cuenta principal'
                  : 'Ingresa tus credenciales'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Display name (setup only) */}
          {isSetup && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder={isSetup ? 'ej: admin' : 'Nombre de usuario'}
                required
                autoComplete="username"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            {isSetup && (
              <p className="text-[10px] text-gray-400 mt-1">Solo letras, números y guiones. Sin espacios.</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSetup ? 'Mínimo 6 caracteres' : '••••••••'}
                required
                minLength={isSetup ? 6 : 1}
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 ${
              isSetup
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200'
            }`}
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Procesando…</>
              : isSetup ? '✓ Crear cuenta y entrar' : 'Entrar'
            }
          </button>
        </form>

        {/* Footer note */}
        {isSetup && (
          <div className="px-6 pb-5">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              Después podrás crear cuentas adicionales desde Configuración.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-[11px] text-gray-400">Datos guardados localmente en tu base de datos</p>
    </div>
  );
}
