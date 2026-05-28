import { NextRequest, NextResponse } from 'next/server';
import {
  initDb, getMonthlySummary, getInvestmentQueries, insertInvestmentQuery,
  getDebts, getMonthlyRecurringTotal, getBusinessMonthlySummary,
} from '@/lib/db';
import { analyzeFinancial } from '@/lib/claude';

export async function GET() {
  await initDb();
  return NextResponse.json(await getInvestmentQueries());
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { query, mode, company_id: bodyCompanyId, company_name, company_legal_type, company_rut, company_giro, company_activity_category } = body;
  if (!query?.trim()) return NextResponse.json({ error: 'Query requerida' }, { status: 400 });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const companyId = Number(bodyCompanyId || 1);

  const [history, debts, monthlyRecurring, bizSummary] = await Promise.all([
    getMonthlySummary(3) as Promise<any[]>,
    getDebts() as Promise<any[]>,
    getMonthlyRecurringTotal(),
    mode === 'business' ? getBusinessMonthlySummary(year, month, companyId) : Promise.resolve(null),
  ]);

  const avgIncome   = history.length ? history.reduce((a, h) => a + Number(h.income), 0)   / history.length : 0;
  const avgExpenses = history.length ? history.reduce((a, h) => a + Number(h.expenses), 0) / history.length : 0;
  const monthlySavings = avgIncome - avgExpenses;

  const totalDebt        = debts.reduce((s: number, d: any) => s + Number(d.current_balance), 0);
  const totalMinPayments = debts.reduce((s: number, d: any) => s + Number(d.minimum_payment), 0);

  const context: any = {
    monthlyIncome:     Math.round(avgIncome),
    monthlyExpenses:   Math.round(avgExpenses),
    monthlySavings:    Math.round(monthlySavings),
    projectedSavings3m: Math.round(monthlySavings * 3),
    projectedSavings6m: Math.round(monthlySavings * 6),
    totalDebt:         Math.round(totalDebt),
    totalMinPayments:  Math.round(totalMinPayments),
    debtCount:         debts.length,
    monthlyRecurring:  Math.round(monthlyRecurring),
    savingsRate:       avgIncome > 0 ? Math.round((monthlySavings / avgIncome) * 100) : 0,
  };

  if (bizSummary) {
    const incomeNet  = Number(bizSummary.income_net  || 0);
    const expenseNet = Number(bizSummary.expense_net || 0);
    context.business = {
      companyName:      company_name             || undefined,
      legalType:        company_legal_type       || undefined,
      rut:              company_rut              || undefined,
      giro:             company_giro             || undefined,
      activityCategory: company_activity_category || undefined,
      incomeNet:    Math.round(incomeNet),
      expenseNet:   Math.round(expenseNet),
      netProfit:    Math.round(incomeNet - expenseNet),
      grossMargin:  incomeNet > 0 ? Math.round(((incomeNet - expenseNet) / incomeNet) * 100) : 0,
      ivaDebito:    Math.round(Number(bizSummary.iva_debito  || 0)),
      ivaCredito:   Math.round(Number(bizSummary.iva_credito || 0)),
      ivaNet:       Math.round(Number(bizSummary.iva_debito  || 0) - Number(bizSummary.iva_credito || 0)),
      ppmRate:      1.0,
      ppmAmount:    Math.round(incomeNet * 0.01),
    };
  }

  const response = await analyzeFinancial(query, context);
  await insertInvestmentQuery(query, response);
  return NextResponse.json({ response });
}
