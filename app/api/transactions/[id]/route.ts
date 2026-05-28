import { NextRequest, NextResponse } from 'next/server';
import { initDb, deleteTransaction, updateTransaction } from '@/lib/db';
import { evaluateAlerts } from '@/lib/alerts';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = await req.json();
  const { type, amount, category_id, description, date } = body;

  const update: Record<string, any> = {};
  if (type !== undefined) update.type = type;
  if (amount !== undefined) update.amount = parseFloat(amount);
  if (category_id !== undefined) update.category_id = category_id;
  if (description !== undefined) update.description = description;
  if (date !== undefined) update.date = date;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  await updateTransaction(parseInt(id), update);

  // Re-evaluate alerts for the affected month
  const targetDate = date ? new Date(date) : new Date();
  await evaluateAlerts(targetDate.getFullYear(), targetDate.getMonth() + 1);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await deleteTransaction(parseInt(id));
  return NextResponse.json({ success: true });
}
