import { NextRequest, NextResponse } from 'next/server';
import {
  initDb, getRecurringExpenses, insertRecurringExpense,
  updateRecurringExpense, deleteRecurringExpense,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const onlyActive = searchParams.get('active') === 'true';
  return NextResponse.json(await getRecurringExpenses(onlyActive));
}

export async function POST(req: NextRequest) {
  await initDb();
  const { name, amount, category_id, day_of_month, color, icon } = await req.json();
  if (!name || !amount || !day_of_month) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  const id = await insertRecurringExpense({
    name,
    amount: Number(amount),
    category_id: category_id ? Number(category_id) : undefined,
    day_of_month: Number(day_of_month),
    color: color ?? '#6366f1',
    icon: icon ?? '🔄',
  });
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  await initDb();
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  await updateRecurringExpense(Number(id), data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  await deleteRecurringExpense(Number(id));
  return NextResponse.json({ ok: true });
}
