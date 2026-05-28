import { NextRequest, NextResponse } from 'next/server';
import { initDb, getAlerts, markAlertRead, markAllAlertsRead, getUnreadAlertCount } from '@/lib/db';

function getUserId(req: NextRequest) {
  return parseInt(req.headers.get('x-user-id') ?? '0') || 1;
}

export async function GET(req: NextRequest) {
  await initDb();
  const userId = getUserId(req);
  const { searchParams } = new URL(req.url);
  const unread = searchParams.get('unread') === 'true';
  const count  = searchParams.get('count')  === 'true';
  if (count)  return NextResponse.json({ count: await getUnreadAlertCount(userId) });
  return NextResponse.json(await getAlerts(userId, unread));
}

export async function PATCH(req: NextRequest) {
  await initDb();
  const userId = getUserId(req);
  const body = await req.json();
  if (body.markAll) await markAllAlertsRead(userId);
  else if (body.id) await markAlertRead(parseInt(body.id));
  return NextResponse.json({ success: true });
}
