import { NextRequest, NextResponse } from 'next/server';
import { initDb, deleteTransaction } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await deleteTransaction(parseInt(id));
  return NextResponse.json({ success: true });
}
