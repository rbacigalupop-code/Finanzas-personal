import { NextResponse } from 'next/server';
import { initDb, getTransactionsByMonth, getSpendingByCategory, getBudgets, getAlerts } from '@/lib/db';

export async function GET() {
  await initDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [transactions, spending, budgets, alerts] = await Promise.all([
    getTransactionsByMonth(year, month),
    getSpendingByCategory(year, month),
    getBudgets(year, month),
    getAlerts(true),
  ]);

  const txs = transactions as any[];
  const income = txs.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
  const expenses = txs.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);

  return NextResponse.json({
    income, expenses, balance: income - expenses,
    spending, budgets, alerts,
    recent: txs.slice(0, 5),
    month, year,
  });
}
