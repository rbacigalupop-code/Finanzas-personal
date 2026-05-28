import { NextRequest, NextResponse } from 'next/server';
import { initDb, getClient } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const year      = Number(searchParams.get('year')      || new Date().getFullYear());
  const month     = Number(searchParams.get('month')     || new Date().getMonth() + 1);
  const companyId = Number(searchParams.get('company_id') || 1);

  const db = getClient();

  // All transactions in the month
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT id, type, net_amount, gross_amount, tax_amount, has_iva,
                 description, date, document_type,
                 bc.name AS category_name, bc.icon AS category_icon, bc.color AS category_color
          FROM business_transactions bt
          LEFT JOIN business_categories bc ON bt.category_id = bc.id
          WHERE strftime('%Y', bt.date) = ?
            AND strftime('%m', bt.date) = ?
            AND bt.company_id = ?
          ORDER BY bt.date ASC`,
    args: [String(year), monthStr, companyId],
  });

  // Group by day
  const byDay: Record<string, {
    income: number; expense: number; count: number;
    entries: Array<{ id: number; type: string; amount: number; desc: string; icon: string; doc: string }>;
  }> = {};

  for (const row of res.rows) {
    const day = (row.date as string).split('T')[0].split('-')[2];
    if (!byDay[day]) byDay[day] = { income: 0, expense: 0, count: 0, entries: [] };
    if (row.type === 'income') byDay[day].income  += Number(row.net_amount);
    else                       byDay[day].expense += Number(row.net_amount);
    byDay[day].count++;
    byDay[day].entries.push({
      id:     Number(row.id),
      type:   row.type as string,
      amount: Number(row.net_amount),
      desc:   (row.description || row.category_name || '') as string,
      icon:   (row.category_icon || '📋') as string,
      doc:    (row.document_type || '') as string,
    });
  }

  return NextResponse.json({ year, month, byDay });
}
