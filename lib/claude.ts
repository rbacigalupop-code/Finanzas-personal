import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface FinancialContext {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  projectedSavings3m: number;
  projectedSavings6m: number;
  totalDebt?: number;
  totalMinPayments?: number;
  debtCount?: number;
  monthlyRecurring?: number;
  savingsRate?: number;
  business?: {
    companyName?: string;
    legalType?: string;
    rut?: string;
    giro?: string;
    activityCategory?: string;
    incomeNet: number;
    expenseNet: number;
    netProfit: number;
    grossMargin: number;
    ivaDebito: number;
    ivaCredito: number;
    ivaNet: number;
    ppmRate: number;
    ppmAmount: number;
  };
}

const CLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const pct  = (n: number) => `${n}%`;

export async function analyzeFinancial(
  query: string,
  context: FinancialContext,
): Promise<string> {
  const savingsRate = context.monthlyIncome > 0
    ? Math.round((context.monthlySavings / context.monthlyIncome) * 100)
    : 0;

  // ── Compact system prompt (≈ 400 tokens vs. old ≈ 900) ──────────────────────
  const profileLines = [
    `Ingreso: ${CLP(context.monthlyIncome)} | Gastos: ${CLP(context.monthlyExpenses)} | Ahorro: ${CLP(context.monthlySavings)} (${pct(savingsRate)})`,
    context.totalDebt        ? `Deuda total: ${CLP(context.totalDebt)} en ${context.debtCount ?? 0} crédito(s) | Cuotas mín.: ${CLP(context.totalMinPayments ?? 0)}/mes` : null,
    context.monthlyRecurring ? `Gastos fijos/mes: ${CLP(context.monthlyRecurring)}` : null,
    `Proyección 3m: ${CLP(context.projectedSavings3m)} | 6m: ${CLP(context.projectedSavings6m)}`,
  ].filter(Boolean).join('\n');

  const bizLines = context.business ? [
    `EMPRESA: ${context.business.companyName ?? '—'} (${context.business.legalType ?? ''})${context.business.rut ? ' RUT ' + context.business.rut : ''}`,
    context.business.giro             ? `Giro: ${context.business.giro}` : null,
    context.business.activityCategory ? `Cat. SII: ${context.business.activityCategory}` : null,
    `Ing. netos: ${CLP(context.business.incomeNet)} | Gastos: ${CLP(context.business.expenseNet)} | Resultado: ${CLP(context.business.netProfit)} (margen ${pct(context.business.grossMargin)})`,
    `IVA débito: ${CLP(context.business.ivaDebito)} | IVA crédito: ${CLP(context.business.ivaCredito)} | IVA neto: ${CLP(context.business.ivaNet)}`,
    `PPM (${context.business.ppmRate}%): ${CLP(context.business.ppmAmount)}`,
  ].filter(Boolean).join('\n') : null;

  const systemPrompt = [
    'Eres asesor financiero de apoyo para Chile (no reemplazas a contador ni abogado).',
    'Responde en español chileno, conciso, con emojis y secciones para mobile.',
    'Usa los números del perfil. Si hay deudas, prioriza liquidarlas antes de invertir.',
    'Las tasas de mercado que menciones son referenciales; indica que el usuario debe verificar en banco/SII/sii.cl.',
    '',
    'PERFIL USUARIO:',
    profileLines,
    bizLines ? '\n' + bizLines : '',
  ].filter((l) => l !== null).join('\n').trim();

  const response = await client.messages.create({
    model:      'claude-haiku-4-5',   // ~20× más barato que Sonnet, 3× más rápido
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: query }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return (
    text +
    '\n\n---\n⚠️ *Orientación referencial — no reemplaza asesoría de contador o especialista. ' +
    'Verifica datos en sii.cl antes de declarar.*'
  );
}
