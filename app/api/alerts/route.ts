import { NextRequest, NextResponse } from 'next/server';
import { initDb, getAlerts, markAlertRead, markAllAlertsRead, getUnreadAlertCount } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const unread = searchParams.get('unread') === 'true';
  const count = searchParams.get('count') === 'true';
  if (count) return NextResponse.json({ count: await getUnreadAlertCount() });
  return NextResponse.json(await getAlerts(unread));
}

export async function PATCH(req: NextRequest) {
  await initDb();
  const body = await req.json();
  if (body.markAll) await markAllAlertsRead();
  else if (body.id) await markAlertRead(parseInt(body.id));
  return NextResponse.json({ success: true });
}
