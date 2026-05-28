import { NextRequest, NextResponse } from 'next/server';
import { initDb, getBudgets, upsertBudget, deleteBudget } from '@/lib/db';

function getUserId(req: NextRequest) {
  return parseInt(req.headers.get('x-user-id') ?? '0') || 1;
}

export async function GET(req: NextRequest) {
  await initDb();
  const userId = getUserId(req);
  const { searchParams } = new URL(req.url);
  const now   = new Date();
  const year  = parseInt(searchParams.get('year')  || String(now.getFullYear()));
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
  return NextResponse.json(await getBudgets(userId, year, month));
}

export async function POST(req: NextRequest) {
  await initDb();
  const userId = getUserId(req);
  const body = await req.json();
  const { category_id, month, year, limit_amount } = body;
  if (!category_id || !month || !year || !limit_amount) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }
  await upsertBudget(userId, category_id, month, year, parseFloat(limit_amount));
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  await deleteBudget(parseInt(id));
  return NextResponse.json({ success: true });
}
