'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, BrainCircuit, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface FinancialQuery {
  id: number;
  query: string;
  response: string;
  created_at: string;
}

const SUGGESTIONS = [
  '¿Cómo puedo salir de mis deudas más rápido?',
  '¿Cuánto debería destinar al pago de deudas vs ahorro?',
  '¿Vale la pena un APV con mi sueldo actual?',
  '¿Cuál es el primer paso para mejorar mis finanzas?',
  '¿Cómo armo un fondo de emergencia?',
  '¿Me conviene refinanciar mis deudas?',
  '¿En qué invertir con poco dinero en Chile?',
  '¿Cómo reducir mis gastos fijos?',
];

function formatResponse(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3} (.+)$/gm, '<p class="font-bold text-gray-800 mt-3 mb-1">$1</p>')
    .replace(/\n/g, '<br/>');
}

export default function AdvisorPage() {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<FinancialQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/investments').then((r) => r.json()).then(setHistory);
  }, []);

  const submit = async (q?: string) => {
    const text = q || query;
    if (!text.trim() || loading) return;
    setLoading(true);
    setQuery('');
    const res = await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text }),
    });
    const data = await res.json();
    setLoading(false);
    setHistory((prev) => [
      { id: Date.now(), query: text, response: data.response, created_at: new Date().toISOString() },
      ...prev,
    ]);
    setExpanded(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <BrainCircuit size={26} className="text-white/90" />
          <h1 className="text-white font-bold text-xl">Asesor Financiero IA</h1>
        </div>
        <p className="text-white/70 text-sm">
          Consultas personalizadas basadas en tu perfil real · acceso a internet en tiempo real
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Input box */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={2}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
              placeholder="¿Cómo puedo mejorar mis finanzas? ¿Me conviene invertir? ¿Cómo pago mis deudas?"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
            <button
              onClick={() => submit()}
              disabled={!query.trim() || loading}
              className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0"
            >
              {loading
                ? <Loader2 size={18} className="text-white animate-spin" />
                : <Send size={16} className="text-white" />}
            </button>
          </div>

          {/* Suggestion chips */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">Consultas frecuentes:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => submit(s)}
                  disabled={loading}
                  className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors active:scale-95 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-4 flex items-center gap-3">
            <Loader2 size={20} className="text-indigo-500 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Analizando tu situación financiera...</p>
              <p className="text-xs text-gray-400">Buscando información actualizada y evaluando tu perfil</p>
            </div>
          </div>
        )}

        {/* History */}
        {history.length === 0 && !loading ? (
          <div className="text-center py-16">
            <BrainCircuit size={44} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm font-medium">Tu asesor financiero personal</p>
            <p className="text-gray-300 text-xs mt-1">
              Pregunta sobre deudas, ahorro, inversiones, presupuesto y más
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Historial de consultas</p>
            {history.map((item, idx) => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                  className="w-full flex items-start gap-3 p-4 text-left"
                >
                  <BrainCircuit size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{item.query}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.created_at).toLocaleDateString('es-CL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {expanded === idx
                    ? <ChevronUp size={16} className="text-gray-400 shrink-0 mt-0.5" />
                    : <ChevronDown size={16} className="text-gray-400 shrink-0 mt-0.5" />}
                </button>
                {expanded === idx && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                    <div
                      className="text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatResponse(item.response) }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
