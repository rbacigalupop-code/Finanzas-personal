import { NextRequest, NextResponse } from 'next/server';
import { initDb, getMonthlySummary, getSpendingByCategory, getBudgets } from '@/lib/db';

function getUserId(req: NextRequest) {
  return parseInt(req.headers.get('x-user-id') ?? '0') || 1;
}

function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0 };
  const xs = data.map((_, i) => i);
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = data.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * data[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function project(data: number[], futureSteps: number): number[] {
  const { slope, intercept } = linearRegression(data);
  return Array.from({ length: futureSteps }, (_, i) =>
    Math.max(0, intercept + slope * (data.length + i))
  );
}

export async function GET(req: NextRequest) {
  await initDb();
  const userId = getUserId(req);
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const [history, spending, budgets] = await Promise.all([
    getMonthlySummary(userId, 6),
    getSpendingByCategory(userId, year, month),
    getBudgets(userId, year, month),
  ]);

  const incomes   = (history as any[]).map((h) => Number(h.income));
  const expenses  = (history as any[]).map((h) => Number(h.expenses));

  const projectedIncome   = project(incomes, 6);
  const projectedExpenses = project(expenses, 6);

  const futureMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const projections = futureMonths.map((m, i) => ({
    month:    m,
    income:   Math.round(projectedIncome[i]),
    expenses: Math.round(projectedExpenses[i]),
    savings:  Math.round(projectedIncome[i] - projectedExpenses[i]),
  }));

  const categoryProjections = (spending as any[]).slice(0, 6).map((cat) => {
    const budget = (budgets as any[]).find((b) => b.category_id === cat.id);
    return {
      name: cat.name, color: cat.color, icon: cat.icon,
      current: Number(cat.total),
      budget: budget ? Number(budget.limit_amount) : null,
      overBudget: budget ? Number(cat.total) > Number(budget.limit_amount) : false,
    };
  });

  return NextResponse.json({ history, projections, categoryProjections });
}
