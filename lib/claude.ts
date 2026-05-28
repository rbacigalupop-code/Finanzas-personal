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

  const systemPrompt = `Eres un especialista financiero completo, experto en finanzas personales Y empresariales chilenas. Tienes acceso a internet para buscar información actualizada sobre tasas, instrumentos de inversión, normativa tributaria chilena (SII, IVA, PPM, renta) y oportunidades financieras. Tienes acceso a internet para buscar información actualizada sobre tasas de interés, instrumentos de inversión, inflación, y oportunidades financieras en Chile.

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

  const tools: Anthropic.Tool[] = [
    {
      name: 'web_search',
      description: 'Busca información actualizada en internet sobre tasas de interés, fondos de inversión, instrumentos financieros chilenos, inflación, AFP, APV, fondos mutuos y cualquier tema financiero relevante.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda. Ser específico, ej: "tasa DAP Chile 2025" o "fondos mutuos renta fija Chile"',
          },
        },
        required: ['query'],
      },
    },
  ];

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: query },
  ];

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    tools,
    messages,
  });

  // Handle tool use loop
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        let result = '';
        if (toolUse.name === 'web_search') {
          const input = toolUse.input as { query: string };
          result = await performWebSearch(input.query);
        }
        return {
          type: 'tool_result' as const,
          tool_use_id: toolUse.id,
          content: result,
        };
      })
    );

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return textContent;
}

async function performWebSearch(query: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(query + ' Chile 2025');
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`
    );
    const data = await res.json();

    const abstract = data.Abstract || '';
    const relatedTopics = (data.RelatedTopics || [])
      .slice(0, 5)
      .map((t: { Text?: string }) => t.Text || '')
      .filter(Boolean)
      .join('\n');

    return abstract || relatedTopics || `Búsqueda realizada para: ${query}`;
  } catch {
    return `Búsqueda realizada para: ${query}. Usa tu conocimiento actualizado sobre finanzas chilenas.`;
  }
}
