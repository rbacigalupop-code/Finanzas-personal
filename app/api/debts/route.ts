import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDebts, insertDebt, updateDebt, deleteDebt } from '@/lib/db';

export async function GET() {
  await initDb();
  return NextResponse.json(await getDebts());
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { name, total_amount, current_balance, interest_rate, minimum_payment, due_day, color, icon } = body;
  if (!name || !total_amount || current_balance == null) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  const id = await insertDebt({
    name,
    total_amount: Number(total_amount),
    current_balance: Number(current_balance),
    interest_rate: Number(interest_rate ?? 0),
    minimum_payment: Number(minimum_payment ?? 0),
    due_day: due_day ? Number(due_day) : undefined,
    color: color ?? '#ef4444',
    icon: icon ?? '💳',
  });
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  await updateDebt(Number(id), data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  await deleteDebt(Number(id));
  return NextResponse.json({ ok: true });
}
