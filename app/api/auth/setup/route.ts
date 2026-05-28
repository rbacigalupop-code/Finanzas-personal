import { NextRequest, NextResponse } from 'next/server';
import { initDb, getUserCount, insertUser } from '@/lib/db';
import { hashPassword, createToken, COOKIE_NAME } from '@/lib/auth';

/** Creates the first admin user (only allowed when no users exist). */
export async function POST(req: NextRequest) {
  await initDb();

  const count = await getUserCount();
  if (count > 0) {
    return NextResponse.json({ error: 'Setup ya completado' }, { status: 403 });
  }

  const { username, displayName, password } = await req.json();
  if (!username?.trim() || !displayName?.trim() || !password) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const userId = await insertUser({
    username:    username.trim().toLowerCase(),
    displayName: displayName.trim(),
    passwordHash,
    isAdmin:     true,
  });

  const token = await createToken({ userId, username: username.trim().toLowerCase(), displayName: displayName.trim(), isAdmin: true });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   30 * 24 * 60 * 60,
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}
