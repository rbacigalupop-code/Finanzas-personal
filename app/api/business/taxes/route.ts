import { NextRequest, NextResponse } from 'next/server';
import {
  initDb, getBusinessMonthlySummary, getTaxPeriod,
  upsertTaxPeriod, getTaxYearSummary,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const now   = new Date();
  const year  = Number(searchParams.get('year')  || now.getFullYear());
  const month = Number(searchParams.get('month') || now.getMonth() + 1);

  const [summary, taxPeriod, yearHistory] = await Promise.all([
    getBusinessMonthlySummary(year, month),
    getTaxPeriod(year, month),
    getTaxYearSummary(year),
  ]);

  const incomeNet  = Number(summary.income_net  || 0);
  const ivaDebito  = Number(summary.iva_debito  || 0);
  const ivaCredito = Number(summary.iva_credito || 0);
  const ivaNet     = ivaDebito - ivaCredito;
  const ppmRate    = Number(taxPeriod?.ppm_rate ?? 1.0);
  const ppmAmount  = Math.round(incomeNet * (ppmRate / 100));

  return NextResponse.json({
    year, month,
    incomeNet:   Math.round(incomeNet),
    ivaDebito:   Math.round(ivaDebito),
    ivaCredito:  Math.round(ivaCredito),
    ivaNet:      Math.round(ivaNet),          // >0 = you owe SII, <0 = SII owes you
    ppmRate,
    ppmAmount,
    isDeclared:  Number(taxPeriod?.is_declared ?? 0),
    notes:       taxPeriod?.notes ?? '',
    yearHistory,
  });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { year, month, ppm_rate, is_declared, notes } = await req.json();
  if (!year || !month) return NextResponse.json({ error: 'year y month requeridos' }, { status: 400 });
  await upsertTaxPeriod(Number(year), Number(month), {
    ppm_rate: ppm_rate !== undefined ? Number(ppm_rate) : undefined,
    is_declared: is_declared !== undefined ? Number(is_declared) : undefined,
    notes: notes ?? undefined,
  });
  return NextResponse.json({ ok: true });
}
