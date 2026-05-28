import { NextRequest, NextResponse } from 'next/server';
import {
  initDb, getAllBusinessTransactions, getBusinessTransactions,
  insertBusinessTransaction, getBusinessCategories,
} from '@/lib/db';

const IVA = 0.19;

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const companyId     = Number(searchParams.get('company_id') || 1);
  const year          = searchParams.get('year');
  const month         = searchParams.get('month');
  const categoriesOnly = searchParams.get('categories');

  if (categoriesOnly) {
    const type = searchParams.get('type') || undefined;
    return NextResponse.json(await getBusinessCategories(type));
  }
  if (year && month) {
    return NextResponse.json(await getBusinessTransactions(Number(year), Number(month), companyId));
  }
  return NextResponse.json(await getAllBusinessTransactions(companyId));
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { type, amount, amount_type, has_iva, category_id, description, date, document_type, company_id } = body;

  if (!type || !amount || !date || !company_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const raw      = Number(amount);
  const applyIva = has_iva ? 1 : 0;

  let net_amount: number, gross_amount: number, tax_amount: number;

  if (applyIva) {
    if (amount_type === 'gross') {
      gross_amount = raw;
      net_amount   = raw / (1 + IVA);
      tax_amount   = raw - net_amount;
    } else {
      net_amount   = raw;
      gross_amount = raw * (1 + IVA);
      tax_amount   = raw * IVA;
    }
  } else {
    net_amount = gross_amount = raw;
    tax_amount = 0;
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
    company_id:   Number(company_id),
  });

  return NextResponse.json({ id }, { status: 201 });
}
