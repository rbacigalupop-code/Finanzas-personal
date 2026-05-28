import { NextResponse } from 'next/server';
import { initDb, getUserCount } from '@/lib/db';

/** Public endpoint — tells the login page if initial setup is needed */
export async function GET() {
  await initDb();
  const count = await getUserCount();
  return NextResponse.json({ hasUsers: count > 0 });
}
