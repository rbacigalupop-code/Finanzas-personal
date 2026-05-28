import { NextResponse } from 'next/server';
import {
  initDb, getBusinessMonthlySummary, getBusinessSpendingByCategory,
  getBusinessTransactions, getTaxPeriod,
} from '@/lib/db';

const IVA_RATE = 0.19;

export async function GET() {
  await initDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [summary, spending, transactions, taxPeriod] = await Promise.all([
    getBusinessMonthlySummary(year, month),
    getBusinessSpendingByCategory(year, month),
    getBusinessTransactions(year, month),
    getTaxPeriod(year, month),
  ]);

  const incomeNet   = Number(summary.income_net   || 0);
  const incomeGross = Number(summary.income_gross  || 0);
  const expenseNet  = Number(summary.expense_net   || 0);
  const ivaDebito   = Number(summary.iva_debito    || 0);
  const ivaCredito  = Number(summary.iva_credito   || 0);
  const ivaNet      = ivaDebito - ivaCredito;
  const grossMargin = incomeNet > 0 ? ((incomeNet - expenseNet) / incomeNet) * 100 : 0;
  const ppmRate     = Number(taxPeriod?.ppm_rate ?? 1.0);
  const ppmAmount   = Math.round(incomeNet * (ppmRate / 100));

  return NextResponse.json({
    year, month,
    incomeNet: Math.round(incomeNet),
    incomeGross: Math.round(incomeGross),
    expenseNet: Math.round(expenseNet),
    netProfit: Math.round(incomeNet - expenseNet),
    grossMargin: Math.round(grossMargin),
    ivaDebito: Math.round(ivaDebito),
    ivaCredito: Math.round(ivaCredito),
    ivaNet: Math.round(ivaNet),
    ppmRate,
    ppmAmount,
    spending: spending.filter((s: any) => Number(s.total) > 0),
    recent: (transactions as any[]).slice(0, 5),
    IVA_RATE,
  });
}
