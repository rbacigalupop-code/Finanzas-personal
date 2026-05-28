import { NextRequest, NextResponse } from 'next/server';
import { initDb, getAllBusinessTransactions, getBusinessTransactions, insertBusinessTransaction, getBusinessCategories } from '@/lib/db';

const IVA = 0.19;

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const year  = searchParams.get('year');
  const month = searchParams.get('month');
  const categoriesOnly = searchParams.get('categories');

  if (categoriesOnly) {
    const type = searchParams.get('type') || undefined;
    return NextResponse.json(await getBusinessCategories(type));
  }
  if (year && month) {
    return NextResponse.json(await getBusinessTransactions(Number(year), Number(month)));
  }
  return NextResponse.json(await getAllBusinessTransactions(200));
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { type, amount, amount_type, has_iva, category_id, description, date, document_type } = body;

  if (!type || !amount || !date) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const raw = Number(amount);
  const applyIva = has_iva ? 1 : 0;

  let net_amount: number;
  let gross_amount: number;
  let tax_amount: number;

  if (applyIva) {
    if (amount_type === 'gross') {
      // User entered bruto (con IVA)
      gross_amount = raw;
      net_amount   = raw / (1 + IVA);
      tax_amount   = raw - net_amount;
    } else {
      // User entered neto (sin IVA) — default
      net_amount   = raw;
      gross_amount = raw * (1 + IVA);
      tax_amount   = raw * IVA;
    }
  } else {
    net_amount   = raw;
    gross_amount = raw;
    tax_amount   = 0;
  }

  const id = await insertBusinessTransaction({
    type,
    gross_amount: Math.round(gross_amount * 100) / 100,
    net_amount:   Math.round(net_amount   * 100) / 100,
    tax_amount:   Math.round(tax_amount   * 100) / 100,
    has_iva:      applyIva,
    category_id:  category_id ? Number(category_id) : undefined,
    description:  description || '',
    date,
    document_type: document_type || (applyIva ? 'factura' : 'boleta'),
  });

  return NextResponse.json({ id }, { status: 201 });
}
