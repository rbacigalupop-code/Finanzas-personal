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
}

export async function analyzeInvestment(
  query: string,
  context: FinancialContext
): Promise<string> {
  const systemPrompt = `Eres un asesor financiero personal experto. Tienes acceso a internet para buscar información actualizada sobre mercados, tasas de interés, activos y oportunidades de inversión.

Contexto financiero del usuario:
- Ingreso mensual: $${context.monthlyIncome.toLocaleString()}
- Gasto mensual: $${context.monthlyExpenses.toLocaleString()}
- Ahorro mensual: $${context.monthlySavings.toLocaleString()}
- Ahorro proyectado 3 meses: $${context.projectedSavings3m.toLocaleString()}
- Ahorro proyectado 6 meses: $${context.projectedSavings6m.toLocaleString()}

Cuando respondas:
1. Busca información actual sobre el tema de inversión consultado
2. Evalúa la factibilidad basada en el perfil financiero del usuario
3. Presenta: Factibilidad (Alta/Media/Baja), Nivel de riesgo, Monto recomendado, Plazo sugerido, Recomendación clara
4. Usa formato estructurado con emojis para mejor lectura`;

  const tools: Anthropic.Tool[] = [
    {
      name: 'web_search',
      description: 'Busca información actualizada en internet sobre mercados financieros, activos, tasas de interés y oportunidades de inversión.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda',
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
    const encoded = encodeURIComponent(query + ' 2025 finanzas inversión');
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

    return abstract || relatedTopics || `Información de búsqueda sobre: ${query}`;
  } catch {
    return `Búsqueda realizada para: ${query}. Usa tu conocimiento actualizado sobre este tema.`;
  }
}
