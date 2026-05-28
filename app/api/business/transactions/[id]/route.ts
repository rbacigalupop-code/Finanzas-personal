import { NextRequest, NextResponse } from 'next/server';
import { initDb, updateBusinessTransaction, deleteBusinessTransaction } from '@/lib/db';

const IVA = 0.19;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = await req.json();
  const { amount, amount_type, has_iva, ...rest } = body;

  const update: Record<string, any> = { ...rest };

  if (amount !== undefined) {
    const raw = Number(amount);
    const applyIva = has_iva ? 1 : 0;

    if (applyIva) {
      if (amount_type === 'gross') {
        update.gross_amount = raw;
        update.net_amount   = raw / (1 + IVA);
        update.tax_amount   = raw - update.net_amount;
      } else {
        update.net_amount   = raw;
        update.gross_amount = raw * (1 + IVA);
        update.tax_amount   = raw * IVA;
      }
    } else {
      update.net_amount   = raw;
      update.gross_amount = raw;
      update.tax_amount   = 0;
    }
    update.has_iva = applyIva;
  }

  await updateBusinessTransaction(Number(id), update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await deleteBusinessTransaction(Number(id));
  return NextResponse.json({ ok: true });
}
