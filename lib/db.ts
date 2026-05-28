import { createClient, type Client } from '@libsql/client';

let client: Client;

export function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) throw new Error('TURSO_DATABASE_URL no configurada');

    client = createClient({
      url,
      authToken: authToken || undefined,
    });
  }
  return client;
}

// ── Schema & Seed ───────────────────────────────────────────────────────────
export async function initDb() {
  const db = getClient();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      type TEXT NOT NULL,
      group_label TEXT
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER,
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      limit_amount REAL NOT NULL,
      UNIQUE(category_id, month, year)
    );
    CREATE TABLE IF NOT EXISTS weekly_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      limit_amount REAL NOT NULL,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      triggered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS investment_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await seedCategories(db);
}

const CATEGORIES = [
  // Gastos
  { name: 'Supermercado',         color: '#16a34a', icon: '🛒', type: 'expense', group: 'Compras'    },
  { name: 'Verdulería/Feria',     color: '#4ade80', icon: '🥦', type: 'expense', group: 'Compras'    },
  { name: 'Café & Colaciones',    color: '#f59e0b', icon: '☕', type: 'expense', group: 'Diario'     },
  { name: 'Transporte diario',    color: '#3b82f6', icon: '🚌', type: 'expense', group: 'Transporte' },
  { name: 'Combustible',          color: '#1d4ed8', icon: '⛽', type: 'expense', group: 'Transporte' },
  { name: 'Arriendo/Hipoteca',    color: '#eab308', icon: '🏠', type: 'expense', group: 'Hogar'      },
  { name: 'Servicios básicos',    color: '#06b6d4', icon: '💡', type: 'expense', group: 'Hogar'      },
  { name: 'Hogar & Mantención',   color: '#78716c', icon: '🔧', type: 'expense', group: 'Hogar'      },
  { name: 'Salud & Farmacia',     color: '#22c55e', icon: '💊', type: 'expense', group: 'Salud'      },
  { name: 'Restaurantes & Salidas', color: '#f97316', icon: '🍽️', type: 'expense', group: 'Ocio'   },
  { name: 'Entrete & Ocio',       color: '#a855f7', icon: '🎬', type: 'expense', group: 'Ocio'       },
  { name: 'Suscripciones',        color: '#8b5cf6', icon: '📱', type: 'expense', group: 'Ocio'       },
  { name: 'Ropa & Calzado',       color: '#ec4899', icon: '👕', type: 'expense', group: 'Personal'   },
  { name: 'Educación',            color: '#2563eb', icon: '🎓', type: 'expense', group: 'Personal'   },
  { name: 'Gastos varios',        color: '#6b7280', icon: '💸', type: 'expense', group: 'Otros'      },
  // Ingresos
  { name: 'Salario',              color: '#22c55e', icon: '💼', type: 'income',  group: 'Trabajo'    },
  { name: 'Freelance/Extra',      color: '#10b981', icon: '💻', type: 'income',  group: 'Trabajo'    },
  { name: 'Inversiones',          color: '#3b82f6', icon: '📈', type: 'income',  group: 'Finanzas'   },
  { name: 'Ahorro retirado',      color: '#0284c7', icon: '🏦', type: 'income',  group: 'Finanzas'   },
  { name: 'Otros ingresos',       color: '#6b7280', icon: '💰', type: 'income',  group: 'Otros'      },
];

async function seedCategories(db: Client) {
  const res = await db.execute('SELECT COUNT(*) as c FROM categories');
  const count = Number((res.rows[0] as any).c);
  if (count > 0) return;

  const stmts = CATEGORIES.map((c) => ({
    sql: 'INSERT INTO categories (name, color, icon, type, group_label) VALUES (?, ?, ?, ?, ?)',
    args: [c.name, c.color, c.icon, c.type, c.group] as any[],
  }));
  await db.batch(stmts, 'write');
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export function getMondayOfWeek(d = new Date()): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().split('T')[0];
}

function toArr(rows: any[]): any[] {
  return rows.map((r) => ({ ...r }));
}

// ── Transactions ─────────────────────────────────────────────────────────────
export async function getTransactions(limit = 50, offset = 0) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return toArr(res.rows);
}

export async function getTransactionsByMonth(year: number, month: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          WHERE strftime('%Y-%m', t.date) = ? ORDER BY t.date DESC`,
    args: [`${year}-${monthStr}`],
  });
  return toArr(res.rows);
}

export async function insertTransaction(data: {
  type: string; amount: number; category_id: number; description: string; date: string;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: 'INSERT INTO transactions (type, amount, category_id, description, date) VALUES (?, ?, ?, ?, ?)',
    args: [data.type, data.amount, data.category_id, data.description, data.date],
  });
  return res.lastInsertRowid;
}

export async function deleteTransaction(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM transactions WHERE id = ?', args: [id] });
}

// ── Categories ───────────────────────────────────────────────────────────────
export async function getCategories(type?: string) {
  const db = getClient();
  const res = type
    ? await db.execute({ sql: 'SELECT * FROM categories WHERE type = ? ORDER BY group_label, name', args: [type] })
    : await db.execute('SELECT * FROM categories ORDER BY type, group_label, name');
  return toArr(res.rows);
}

// ── Monthly Budgets ──────────────────────────────────────────────────────────
export async function getBudgets(year: number, month: number) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT b.*, c.name as category_name, c.color as category_color,
                 c.icon as category_icon, c.group_label as category_group
          FROM budgets b JOIN categories c ON b.category_id = c.id
          WHERE b.year = ? AND b.month = ? ORDER BY c.group_label, c.name`,
    args: [year, month],
  });
  return toArr(res.rows);
}

export async function upsertBudget(category_id: number, month: number, year: number, limit_amount: number) {
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO budgets (category_id, month, year, limit_amount) VALUES (?, ?, ?, ?)
          ON CONFLICT(category_id, month, year) DO UPDATE SET limit_amount = excluded.limit_amount`,
    args: [category_id, month, year, limit_amount],
  });
}

export async function deleteBudget(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM budgets WHERE id = ?', args: [id] });
}

// ── Weekly Budgets ───────────────────────────────────────────────────────────
export async function getWeeklyBudget(weekStart: string) {
  const db = getClient();
  const res = await db.execute({ sql: 'SELECT * FROM weekly_budgets WHERE week_start = ?', args: [weekStart] });
  return res.rows[0] ? { ...res.rows[0] } : undefined;
}

export async function upsertWeeklyBudget(weekStart: string, limit_amount: number, note?: string) {
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO weekly_budgets (week_start, limit_amount, note) VALUES (?, ?, ?)
          ON CONFLICT(week_start) DO UPDATE SET limit_amount = excluded.limit_amount, note = excluded.note`,
    args: [weekStart, limit_amount, note ?? null],
  });
}

export async function deleteWeeklyBudget(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM weekly_budgets WHERE id = ?', args: [id] });
}

export async function getWeeklySpendingByDay(weekStart: string) {
  const db = getClient();
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().split('T')[0];
  const res = await db.execute({
    sql: `SELECT date, SUM(amount) as total FROM transactions
          WHERE type = 'expense' AND date >= ? AND date <= ?
          GROUP BY date ORDER BY date ASC`,
    args: [weekStart, endStr],
  });
  return toArr(res.rows) as Array<{ date: string; total: number }>;
}

export async function getWeeklySpendingByCategory(weekStart: string) {
  const db = getClient();
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().split('T')[0];
  const res = await db.execute({
    sql: `SELECT c.id, c.name, c.color, c.icon, c.group_label,
                 COALESCE(SUM(t.amount), 0) as total
          FROM categories c
          LEFT JOIN transactions t ON t.category_id = c.id
            AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
          WHERE c.type = 'expense'
          GROUP BY c.id HAVING total > 0 ORDER BY total DESC`,
    args: [weekStart, endStr],
  });
  return toArr(res.rows);
}

// ── Spending by category ─────────────────────────────────────────────────────
export async function getSpendingByCategory(year: number, month: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT c.id, c.name, c.color, c.icon, COALESCE(SUM(t.amount), 0) as total
          FROM categories c
          LEFT JOIN transactions t ON t.category_id = c.id
            AND strftime('%Y-%m', t.date) = ? AND t.type = 'expense'
          WHERE c.type = 'expense'
          GROUP BY c.id ORDER BY total DESC`,
    args: [`${year}-${monthStr}`],
  });
  return toArr(res.rows);
}

// ── Projections ──────────────────────────────────────────────────────────────
export async function getMonthlySummary(months = 6) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT strftime('%Y-%m', date) as month,
                 SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
                 SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
          FROM transactions
          WHERE date >= date('now', '-' || ? || ' months')
          GROUP BY month ORDER BY month ASC`,
    args: [months],
  });
  return toArr(res.rows);
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export async function getAlerts(onlyUnread = false) {
  const db = getClient();
  const res = onlyUnread
    ? await db.execute('SELECT * FROM alerts WHERE is_read=0 ORDER BY triggered_at DESC')
    : await db.execute('SELECT * FROM alerts ORDER BY triggered_at DESC LIMIT 50');
  return toArr(res.rows);
}

export async function insertAlert(type: string, message: string) {
  const db = getClient();
  await db.execute({ sql: 'INSERT INTO alerts (type, message) VALUES (?, ?)', args: [type, message] });
}

export async function markAlertRead(id: number) {
  const db = getClient();
  await db.execute({ sql: 'UPDATE alerts SET is_read=1 WHERE id=?', args: [id] });
}

export async function markAllAlertsRead() {
  const db = getClient();
  await db.execute('UPDATE alerts SET is_read=1');
}

export async function getUnreadAlertCount() {
  const db = getClient();
  const res = await db.execute('SELECT COUNT(*) as c FROM alerts WHERE is_read=0');
  return Number((res.rows[0] as any).c);
}

// ── Investment queries ────────────────────────────────────────────────────────
export async function getInvestmentQueries() {
  const db = getClient();
  const res = await db.execute('SELECT * FROM investment_queries ORDER BY created_at DESC LIMIT 20');
  return toArr(res.rows);
}

export async function insertInvestmentQuery(query: string, response: string) {
  const db = getClient();
  await db.execute({ sql: 'INSERT INTO investment_queries (query, response) VALUES (?, ?)', args: [query, response] });
}
