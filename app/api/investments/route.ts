import { NextRequest, NextResponse } from 'next/server';
import { initDb, getMonthlySummary, getInvestmentQueries, insertInvestmentQuery } from '@/lib/db';
import { analyzeInvestment } from '@/lib/claude';

export async function GET() {
  await initDb();
  return NextResponse.json(await getInvestmentQueries());
}

export async function POST(req: NextRequest) {
  await initDb();
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: 'Query requerida' }, { status: 400 });

  const history = await getMonthlySummary(3) as any[];
  const avgIncome = history.length ? history.reduce((a, h) => a + Number(h.income), 0) / history.length : 0;
  const avgExpenses = history.length ? history.reduce((a, h) => a + Number(h.expenses), 0) / history.length : 0;
  const monthlySavings = avgIncome - avgExpenses;

  const context = {
    monthlyIncome: Math.round(avgIncome),
    monthlyExpenses: Math.round(avgExpenses),
    monthlySavings: Math.round(monthlySavings),
    projectedSavings3m: Math.round(monthlySavings * 3),
    projectedSavings6m: Math.round(monthlySavings * 6),
  };

  const response = await analyzeInvestment(query, context);
  await insertInvestmentQuery(query, response);
  return NextResponse.json({ response });
}
