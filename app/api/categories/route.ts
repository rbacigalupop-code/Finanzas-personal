import { NextRequest, NextResponse } from 'next/server';
import { initDb, getCategories } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || undefined;
  return NextResponse.json(await getCategories(type));
}
