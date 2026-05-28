import { NextRequest, NextResponse } from 'next/server';
import { initDb, getTransactions, insertTransaction, getTransactionsByMonth } from '@/lib/db';
import { evaluateAlerts } from '@/lib/alerts';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (year && month) {
    return NextResponse.json(await getTransactionsByMonth(parseInt(year), parseInt(month)));
  }
  return NextResponse.json(await getTransactions(limit, offset));
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { type, amount, category_id, description, date } = body;
  if (!type || !amount || !category_id || !date) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }
  const id = await insertTransaction({ type, amount: parseFloat(amount), category_id, description: description || '', date });
  const d = new Date(date);
  await evaluateAlerts(d.getFullYear(), d.getMonth() + 1);
  return NextResponse.json({ id }, { status: 201 });
}
