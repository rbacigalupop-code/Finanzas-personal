import { NextRequest, NextResponse } from 'next/server';
import {
  initDb, getMonthlySummary, getInvestmentQueries, insertInvestmentQuery,
  getDebts, getMonthlyRecurringTotal,
} from '@/lib/db';
import { analyzeFinancial } from '@/lib/claude';

export async function GET() {
  await initDb();
  return NextResponse.json(await getInvestmentQueries());
}

export async function POST(req: NextRequest) {
  await initDb();
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: 'Query requerida' }, { status: 400 });

  const [history, debts, monthlyRecurring] = await Promise.all([
    getMonthlySummary(3) as Promise<any[]>,
    getDebts() as Promise<any[]>,
    getMonthlyRecurringTotal(),
  ]);

  const avgIncome = history.length ? history.reduce((a, h) => a + Number(h.income), 0) / history.length : 0;
  const avgExpenses = history.length ? history.reduce((a, h) => a + Number(h.expenses), 0) / history.length : 0;
  const monthlySavings = avgIncome - avgExpenses;

  const totalDebt = debts.reduce((s: number, d: any) => s + Number(d.current_balance), 0);
  const totalMinPayments = debts.reduce((s: number, d: any) => s + Number(d.minimum_payment), 0);

  const context = {
    monthlyIncome: Math.round(avgIncome),
    monthlyExpenses: Math.round(avgExpenses),
    monthlySavings: Math.round(monthlySavings),
    projectedSavings3m: Math.round(monthlySavings * 3),
    projectedSavings6m: Math.round(monthlySavings * 6),
    totalDebt: Math.round(totalDebt),
    totalMinPayments: Math.round(totalMinPayments),
    debtCount: debts.length,
    monthlyRecurring: Math.round(monthlyRecurring),
    savingsRate: avgIncome > 0 ? Math.round((monthlySavings / avgIncome) * 100) : 0,
  };

  const response = await analyzeFinancial(query, context);
  await insertInvestmentQuery(query, response);
  return NextResponse.json({ response });
}
