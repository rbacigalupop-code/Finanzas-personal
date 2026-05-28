import { NextRequest, NextResponse } from 'next/server';
import {
  initDb, getWeeklyBudget, upsertWeeklyBudget, deleteWeeklyBudget,
  getWeeklySpendingByDay, getWeeklySpendingByCategory, getMondayOfWeek,
} from '@/lib/db';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get('week_start') ?? getMondayOfWeek(new Date());

  const [budget, dailySpending, categorySpending] = await Promise.all([
    getWeeklyBudget(weekStart),
    getWeeklySpendingByDay(weekStart),
    getWeeklySpendingByCategory(weekStart),
  ]);

  const today = new Date().toISOString().split('T')[0];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const found = dailySpending.find((s) => s.date === dateStr);
    return {
      day: DAY_NAMES[i],
      date: dateStr,
      total: found?.total ?? 0,
      isToday: dateStr === today,
      isFuture: dateStr > today,
    };
  });

  const totalSpent = days.reduce((a, d) => a + d.total, 0);
  const todayIdx = days.findIndex((d) => d.isToday);
  const daysElapsed = todayIdx === -1 ? 7 : todayIdx + 1;
  const daysLeft = Math.max(0, 7 - daysElapsed);
  const budgetAmt = budget ? Number((budget as any).limit_amount) : null;
  const dailyLimit = budgetAmt ? budgetAmt / 7 : null;
  const remainingBudget = budgetAmt ? budgetAmt - totalSpent : null;

  return NextResponse.json({
    weekStart, budget, days, totalSpent, dailyLimit, remainingBudget, daysLeft, daysElapsed, categorySpending,
  });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { week_start, limit_amount, note } = await req.json();
  if (!week_start || !limit_amount) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }
  await upsertWeeklyBudget(week_start, parseFloat(limit_amount), note);
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  await deleteWeeklyBudget(parseInt(id));
  return NextResponse.json({ success: true });
}
