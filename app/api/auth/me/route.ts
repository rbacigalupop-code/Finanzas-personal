import { NextRequest, NextResponse } from 'next/server';

/** Returns the current user info from middleware-injected headers.
 *  Also accessible when not logged in (middleware allows /api/auth/ prefix). */
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      userId:      parseInt(userId),
      username:    req.headers.get('x-user-name')  ?? '',
      displayName: req.headers.get('x-user-dn')    ?? '',
      isAdmin:     req.headers.get('x-user-admin') === '1',
    },
  });
}
