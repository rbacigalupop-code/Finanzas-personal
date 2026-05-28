import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
  debtToIncomeRatio?: number;
  // Business context (optional)
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

export async function analyzeFinancial(
  query: string,
  context: FinancialContext
): Promise<string> {
  const savingsRate = context.monthlyIncome > 0
    ? ((context.monthlySavings / context.monthlyIncome) * 100).toFixed(1)
    : '0';

  const debtToIncome = context.monthlyIncome > 0 && context.totalDebt
    ? ((context.totalDebt / context.monthlyIncome) * 100).toFixed(0)
    : null;

  const hasBusinessCtx = Boolean(context.business);

  const systemPrompt = `Eres un especialista financiero completo, experto en finanzas personales Y empresariales chilenas. Eres una herramienta de APOYO y ORIENTACIÓN — no reemplazas a un contador certificado. Siempre que des información tributaria (IVA, PPM, retenciones, F29, renta) indica que debe verificarse con un contador o en sii.cl. Usas tu conocimiento actualizado de entrenamiento sobre el mercado financiero chileno: instrumentos de inversión, tasas referenciales, normativa tributaria (SII, IVA, PPM, renta) y estrategias financieras. Cuando indiques tasas o valores de mercado (DAP, fondos mutuos, UF, etc.) aclara que son referenciales y pueden variar — el usuario debe verificar en el sitio del banco o institución.

═══════════════════════════════════════
PERFIL FINANCIERO DEL USUARIO (actualizado)
═══════════════════════════════════════
💰 Ingreso mensual:        $${context.monthlyIncome.toLocaleString('es-CL')}
💸 Gastos mensuales:       $${context.monthlyExpenses.toLocaleString('es-CL')}
💵 Ahorro neto mensual:    $${context.monthlySavings.toLocaleString('es-CL')} (${savingsRate}% tasa de ahorro)
📈 Proyección 3 meses:     $${context.projectedSavings3m.toLocaleString('es-CL')}
📈 Proyección 6 meses:     $${context.projectedSavings6m.toLocaleString('es-CL')}
${context.totalDebt ? `🔴 Deuda total:            $${context.totalDebt.toLocaleString('es-CL')}` : ''}
${context.totalMinPayments ? `📋 Cuotas mínimas/mes:    $${context.totalMinPayments.toLocaleString('es-CL')}` : ''}
${context.debtCount !== undefined ? `🗂️  Nro. de deudas:         ${context.debtCount}` : ''}
${context.monthlyRecurring ? `🔄 Gastos fijos/mes:       $${context.monthlyRecurring.toLocaleString('es-CL')}` : ''}
${debtToIncome ? `📊 Ratio deuda/ingreso:    ${debtToIncome}%` : ''}
${hasBusinessCtx ? `
═══════════════════════════════════════
PERFIL EMPRESARIAL (mes actual)
═══════════════════════════════════════
🏢 Empresa:                 ${context.business!.companyName ?? 'Sin nombre'} ${context.business!.legalType ? `(${context.business!.legalType})` : ''}${context.business!.rut ? ` · RUT ${context.business!.rut}` : ''}
${context.business!.giro ? `🏷️  Giro declarado:          ${context.business!.giro}` : ''}
${context.business!.activityCategory ? `📂 Categoría actividad SII: ${context.business!.activityCategory}` : ''}
📈 Ingresos netos empresa:  $${context.business!.incomeNet.toLocaleString('es-CL')}
📉 Gastos netos empresa:    $${context.business!.expenseNet.toLocaleString('es-CL')}
💹 Resultado neto:          $${context.business!.netProfit.toLocaleString('es-CL')}
📊 Margen bruto:            ${context.business!.grossMargin}%
🧾 IVA débito:              $${context.business!.ivaDebito.toLocaleString('es-CL')}
🧾 IVA crédito:             $${context.business!.ivaCredito.toLocaleString('es-CL')}
⚖️  IVA neto (a pagar SII): $${context.business!.ivaNet.toLocaleString('es-CL')}
💰 PPM (${context.business!.ppmRate}%):            $${context.business!.ppmAmount.toLocaleString('es-CL')}` : ''}

═══════════════════════════════════════
ÁREAS EN QUE PUEDES AYUDAR
═══════════════════════════════════════
• 💳 Gestión y eliminación de deudas (Avalancha, Bola de Nieve)
• 💰 Estrategias de ahorro y presupuesto (método 50/30/20, etc.)
• 📈 Oportunidades de inversión (APV, fondos mutuos, acciones, DAP, etc.)
• 🏦 Productos financieros chilenos (Cuenta 2 AFP, APV, fondos, etc.)
• 🛡️ Fondo de emergencia
• 📱 Optimización de gastos fijos y suscripciones
• 🎯 Metas financieras y planificación
• 🏢 Finanzas empresariales: IVA, PPM, F29, optimización fiscal
• 📊 Análisis de márgenes, flujo de caja y rentabilidad empresarial
• ⚖️  Normativa tributaria chilena (SII, declaraciones, retenciones)
• 💡 Consejos prácticos adaptados al perfil real del usuario

INSTRUCCIONES DE RESPUESTA:
1. Sé concreto y personalizado — usa los números reales del perfil del usuario
2. Si se consulta sobre inversiones, busca tasas/opciones actuales en Chile con internet
3. Evalúa siempre la factibilidad según su capacidad de ahorro real
4. Usa formato con emojis y secciones claras para mejor lectura mobile
5. Sé directo y accionable — da pasos concretos, no solo teoría
6. Si hay deudas, siempre prioriza su liquidación antes de invertir (excepto APV con match del empleador)
7. Adapta el lenguaje: simple, cercano y en español chileno`;

  // Single API call — no tool use loop needed.
  // Claude Sonnet's training knowledge covers Chilean finance comprehensively.
  // A fake DuckDuckGo search was removed: it returned empty results 95% of the time
  // and caused multiple slow round-trips that hit Vercel's function timeout.
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: query },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1600,
    system: systemPrompt,
    messages,
  });

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const disclaimer =
    '\n\n---\n⚠️ *Esta respuesta es referencial y no reemplaza la asesoría de un contador o especialista tributario. ' +
    'Verifica montos, tasas y fechas en sii.cl antes de declarar o pagar. ' +
    'El desarrollador no asume responsabilidad por decisiones tomadas en base a esta información.*';

  return textContent + disclaimer;
}
