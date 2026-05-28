import { NextRequest, NextResponse } from 'next/server';
import { initDb, getUserByUsername } from '@/lib/db';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await initDb();
  const { username, password } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 });
  }

  const user = await getUserByUsername(username.trim().toLowerCase());
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }

  const token = await createToken({
    userId:      user.id,
    username:    user.username,
    displayName: user.display_name,
    isAdmin:     user.is_admin === 1,
  });

  const res = NextResponse.json({ ok: true, displayName: user.display_name });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   30 * 24 * 60 * 60, // 30 days
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}
