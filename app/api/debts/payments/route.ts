import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDebtPayments, insertDebtPayment } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const debtId = searchParams.get('debt_id');
  if (!debtId) return NextResponse.json({ error: 'debt_id requerido' }, { status: 400 });
  return NextResponse.json(await getDebtPayments(Number(debtId)));
}

export async function POST(req: NextRequest) {
  await initDb();
  const { debt_id, amount, date, note } = await req.json();
  if (!debt_id || !amount || !date) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  const id = await insertDebtPayment(Number(debt_id), Number(amount), date, note);
  return NextResponse.json({ id });
}
