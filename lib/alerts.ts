import { getBudgets, getSpendingByCategory, insertAlert, getAlerts } from './db';

export async function evaluateAlerts(userId: number, year: number, month: number) {
  const [budgets, spending, existingAlerts] = await Promise.all([
    getBudgets(userId, year, month),
    getSpendingByCategory(userId, year, month),
    getAlerts(userId),
  ]);

  const existingMessages = new Set((existingAlerts as any[]).map((a) => a.message));

  for (const budget of budgets as any[]) {
    const cat = (spending as any[]).find((s) => s.id === budget.category_id);
    if (!cat) continue;
    const ratio = cat.total / budget.limit_amount;
    const pct = Math.round(ratio * 100);

    if (ratio >= 1) {
      const msg = `${budget.category_icon} ${budget.category_name}: presupuesto SUPERADO (${pct}% — $${cat.total.toLocaleString()} de $${budget.limit_amount.toLocaleString()})`;
      if (!existingMessages.has(msg)) await insertAlert(userId, 'critical', msg);
    } else if (ratio >= 0.8) {
      const msg = `${budget.category_icon} ${budget.category_name}: cerca del límite (${pct}% — $${cat.total.toLocaleString()} de $${budget.limit_amount.toLocaleString()})`;
      if (!existingMessages.has(msg)) await insertAlert(userId, 'warning', msg);
    }
  }
}
