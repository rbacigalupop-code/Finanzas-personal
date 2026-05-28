import { NextRequest, NextResponse } from 'next/server';
import { initDb, getUsers, insertUser, deleteUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

function isAdmin(req: NextRequest) {
  return req.headers.get('x-user-admin') === '1';
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  await initDb();
  return NextResponse.json(await getUsers());
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  await initDb();

  const { username, displayName, password } = await req.json();
  if (!username?.trim() || !displayName?.trim() || !password) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Contraseña mínimo 6 caracteres' }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const id = await insertUser({
      username:    username.trim().toLowerCase(),
      displayName: displayName.trim(),
      passwordHash,
      isAdmin:     false,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  await initDb();

  const currentUserId = parseInt(req.headers.get('x-user-id') ?? '0');
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') ?? '0');

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  if (id === currentUserId) return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
