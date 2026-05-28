import { NextRequest, NextResponse } from 'next/server';
import { initDb, getCompanies, getCompany, insertCompany, updateCompany, deleteCompany } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const company = await getCompany(Number(id));
    if (!company) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(company);
  }
  return NextResponse.json(await getCompanies());
}

export async function POST(req: NextRequest) {
  await initDb();
  const { name, legal_type, rut, color, icon } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  const id = await insertCompany({
    name: name.trim(),
    legal_type: legal_type || 'SPA',
    rut: rut?.trim() || undefined,
    color: color || '#10b981',
    icon: icon || '🏢',
  });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await initDb();
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  await updateCompany(Number(id), data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  await deleteCompany(Number(id));
  return NextResponse.json({ ok: true });
}
