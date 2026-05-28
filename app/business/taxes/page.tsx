'use client';

import { useEffect, useState } from 'react';
import { Receipt, CheckCircle, Clock, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import CompanySelector from '@/components/CompanySelector';
import SiiAlerts from '@/components/SiiAlerts';
import DisclaimerBanner from '@/components/DisclaimerBanner';

interface TaxData {
  year: number; month: number;
  incomeNet: number;
  ivaDebito: number; ivaCredito: number; ivaNet: number;
  ppmRate: number; ppmAmount: number;
  isDeclared: number; notes: string;
  yearHistory: Array<{
    month: string; iva_debito: number; iva_credito: number; net_income: number;
  }>;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString('es-CL');

export default function TaxesPage() {
  const { activeCompany } = useCompany();
  const now = new Date();
  const [selYear, setSelYear]   = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [data, setData]         = useState<TaxData | null>(null);
  const [ppmInput, setPpmInput] = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!activeCompany) return;
    fetch(`/api/business/taxes?year=${selYear}&month=${selMonth}&company_id=${activeCompany.id}`)
      .then((r) => r.json())
      .then((d: TaxData) => {
        setData(d);
        setPpmInput(String(d.ppmRate));
        setNotes(d.notes || '');
      });
  }, [selYear, selMonth, activeCompany]);

  async function savePeriod(isDeclared?: number) {
    if (!activeCompany) return;
    setSaving(true);
    await fetch('/api/business/taxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: selYear, month: selMonth,
        company_id: activeCompany.id,
        ppm_rate: parseFloat(ppmInput) || 1.0,
        is_declared: isDeclared !== undefined ? isDeclared : data?.isDeclared,
        notes,
      }),
    });
    const d = await fetch(`/api/business/taxes?year=${selYear}&month=${selMonth}&company_id=${activeCompany.id}`).then((r) => r.json());
    setData(d);
    setSaving(false);
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const ivaPositive  = data.ivaNet >= 0;
  const totalOblig   = data.ivaNet + data.ppmAmount;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          {activeCompany ? <CompanySelector /> : (
            <div className="flex items-center gap-2">
              <Receipt size={22} className="text-white/90" />
              <h1 className="text-white font-bold text-xl">Impuestos</h1>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={16} className="text-white/70" />
          <p className="text-white font-semibold">Impuestos</p>
        </div>

        {/* Month selector */}
        <div className="flex gap-2">
          <select
            value={selMonth}
            onChange={(e) => setSelMonth(Number(e.target.value))}
            className="flex-1 bg-white/20 text-white rounded-xl px-3 py-2 text-sm font-medium appearance-none focus:outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1} className="text-gray-800">{m}</option>
            ))}
          </select>
          <select
            value={selYear}
            onChange={(e) => setSelYear(Number(e.target.value))}
            className="bg-white/20 text-white rounded-xl px-3 py-2 text-sm font-medium appearance-none focus:outline-none"
          >
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <option key={y} value={y} className="text-gray-800">{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Status badge */}
        <div className={`flex items-center gap-3 rounded-2xl p-4 border ${
          data.isDeclared
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          {data.isDeclared
            ? <CheckCircle size={22} className="text-green-500 shrink-0" />
            : <Clock size={22} className="text-amber-500 shrink-0" />}
          <div className="flex-1">
            <p className={`text-sm font-bold ${data.isDeclared ? 'text-green-700' : 'text-amber-700'}`}>
              {data.isDeclared ? 'Período declarado en SII' : 'Período pendiente de declarar'}
            </p>
            <p className="text-xs text-gray-500">{MONTHS[selMonth - 1]} {selYear}</p>
          </div>
          <button
            onClick={() => savePeriod(data.isDeclared ? 0 : 1)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              data.isDeclared ? 'bg-gray-200 text-gray-600' : 'bg-green-500 text-white'
            }`}
          >
            {data.isDeclared ? 'Reabrir' : 'Marcar declarado'}
          </button>
        </div>

        {/* IVA section */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            IVA — {MONTHS[selMonth - 1]} {selYear}
          </p>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-700 font-medium">IVA Débito</p>
                <p className="text-xs text-gray-400">De tus ventas con factura</p>
              </div>
              <p className="text-base font-bold text-red-500">${fmt(data.ivaDebito)}</p>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-700 font-medium">IVA Crédito</p>
                <p className="text-xs text-gray-400">De tus compras con factura</p>
              </div>
              <p className="text-base font-bold text-green-600">${fmt(data.ivaCredito)}</p>
            </div>

            <div className="h-px bg-gray-100" />

            <div className={`flex justify-between items-center rounded-xl p-3 ${ivaPositive ? 'bg-red-50' : 'bg-green-50'}`}>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {ivaPositive ? '⚠️ IVA a pagar al SII' : '✅ Crédito IVA a favor'}
                </p>
                <p className="text-xs text-gray-400">
                  {ivaPositive ? 'Vence el día 12 del mes siguiente' : 'Se imputa al próximo período'}
                </p>
              </div>
              <p className={`text-xl font-bold ${ivaPositive ? 'text-red-600' : 'text-green-600'}`}>
                ${fmt(data.ivaNet)}
              </p>
            </div>
          </div>
        </div>

        {/* PPM section */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">PPM — Pago Provisional Mensual</p>
            <div className="relative group">
              <Info size={13} className="text-gray-300" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            El PPM es un anticipo del impuesto a la renta. Se calcula sobre tus ingresos netos mensuales y se declara en el F29.
          </p>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Tasa PPM (%)</label>
              <input
                type="number"
                value={ppmInput}
                onChange={(e) => setPpmInput(e.target.value)}
                step="0.1"
                min="0"
                max="15"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Base (ingresos netos)</p>
              <p className="text-sm font-bold text-gray-700">${fmt(data.incomeNet)}</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-amber-50 rounded-xl p-3">
            <p className="text-sm font-bold text-gray-700">💰 PPM a pagar</p>
            <p className="text-xl font-bold text-amber-600">
              ${fmt(data.incomeNet * (parseFloat(ppmInput) / 100 || 0))}
            </p>
          </div>
        </div>

        {/* Total obligations */}
        {(data.ivaNet > 0 || data.ppmAmount > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wide">Obligaciones del mes</p>
            <div className="space-y-1.5 text-sm">
              {data.ivaNet > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA neto</span>
                  <span className="font-semibold text-red-600">${fmt(data.ivaNet)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">PPM ({ppmInput}%)</span>
                <span className="font-semibold text-amber-600">${fmt(data.incomeNet * (parseFloat(ppmInput) / 100 || 0))}</span>
              </div>
              <div className="h-px bg-orange-200" />
              <div className="flex justify-between font-bold text-base">
                <span className="text-gray-800">Total F29 estimado</span>
                <span className="text-orange-700">${fmt(Math.max(0, data.ivaNet) + data.incomeNet * (parseFloat(ppmInput) / 100 || 0))}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium mb-2">Notas del período</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: Factura 1234 pendiente de cobro..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            onClick={() => savePeriod()}
            disabled={saving}
            className="mt-2 w-full bg-amber-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 hover:bg-amber-600 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar período'}
          </button>
        </div>

        {/* SII Deadlines */}
        <SiiAlerts />

        {/* Disclaimer */}
        <DisclaimerBanner />

        {/* Year history */}
        {data.yearHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between p-4"
            >
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Resumen anual {selYear}
              </p>
              {showHistory ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {showHistory && (
              <div className="divide-y divide-gray-50 border-t border-gray-50">
                {data.yearHistory.map((h) => {
                  const ivaNet = Number(h.iva_debito) - Number(h.iva_credito);
                  const ppm = Number(h.net_income) * (parseFloat(ppmInput) / 100 || 0);
                  return (
                    <div key={h.month} className="flex items-center px-4 py-3 gap-2 text-xs">
                      <span className="w-8 font-bold text-gray-700">{MONTHS[parseInt(h.month) - 1].slice(0, 3)}</span>
                      <div className="flex-1 grid grid-cols-3 gap-1 text-right">
                        <div>
                          <p className="text-gray-400">IVA Déb.</p>
                          <p className="font-medium text-red-500">${fmt(Number(h.iva_debito))}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">IVA Créd.</p>
                          <p className="font-medium text-green-600">${fmt(Number(h.iva_credito))}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">IVA neto</p>
                          <p className={`font-bold ${ivaNet >= 0 ? 'text-red-500' : 'text-green-600'}`}>${fmt(ivaNet)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
