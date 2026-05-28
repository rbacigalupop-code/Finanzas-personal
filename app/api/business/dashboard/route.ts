import { NextRequest, NextResponse } from 'next/server';
import {
  initDb, getBusinessMonthlySummary, getBusinessSpendingByCategory,
  getBusinessTransactions, getTaxPeriod, getCompany, getBusinessMonthlyHistory,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const companyId = Number(searchParams.get('company_id') || 1);

  const now = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const [company, summary, spending, transactions, taxPeriod, monthlyHistory] = await Promise.all([
    getCompany(companyId),
    getBusinessMonthlySummary(year, month, companyId),
    getBusinessSpendingByCategory(year, month, companyId),
    getBusinessTransactions(year, month, companyId),
    getTaxPeriod(year, month, companyId),
    getBusinessMonthlyHistory(companyId, 6),
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
    company,
    year, month,
    incomeNet:   Math.round(incomeNet),
    incomeGross: Math.round(incomeGross),
    expenseNet:  Math.round(expenseNet),
    netProfit:   Math.round(incomeNet - expenseNet),
    grossMargin: Math.round(grossMargin),
    ivaDebito:   Math.round(ivaDebito),
    ivaCredito:  Math.round(ivaCredito),
    ivaNet:      Math.round(ivaNet),
    ppmRate,
    ppmAmount,
    spending:    spending.filter((s: any) => Number(s.total) > 0),
    recent:      (transactions as any[]).slice(0, 5),
    monthlyHistory: (monthlyHistory as any[]).map((h) => ({
      month:        (h.month as string).split('-')[1],  // "01" … "12"
      net_income:   Math.round(Number(h.income   || 0)),
      net_expenses: Math.round(Number(h.expenses || 0)),
      net_profit:   Math.round(Number(h.income   || 0) - Number(h.expenses || 0)),
    })),
  });
}
