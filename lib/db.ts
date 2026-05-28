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
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      current_balance REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0,
      minimum_payment REAL NOT NULL DEFAULT 0,
      due_day INTEGER,
      color TEXT NOT NULL DEFAULT '#ef4444',
      icon TEXT NOT NULL DEFAULT '💳',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER,
      day_of_month INTEGER NOT NULL DEFAULT 1,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT '🔄',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS business_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      type TEXT NOT NULL,
      group_label TEXT
    );
    CREATE TABLE IF NOT EXISTS business_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      gross_amount REAL NOT NULL,
      net_amount REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      has_iva INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      description TEXT,
      date TEXT NOT NULL,
      document_type TEXT NOT NULL DEFAULT 'boleta',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tax_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      ppm_rate REAL NOT NULL DEFAULT 1.0,
      is_declared INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      UNIQUE(month, year)
    );
  `);

  await seedCategories(db);
  await seedBusinessCategories(db);
}

const BUSINESS_CATEGORIES = [
  // Ingresos empresa
  { name: 'Venta productos',    color: '#16a34a', icon: '🛒', type: 'income',  group: 'Ingresos'    },
  { name: 'Servicios',          color: '#3b82f6', icon: '🔧', type: 'income',  group: 'Ingresos'    },
  { name: 'Consultoría',        color: '#8b5cf6', icon: '💼', type: 'income',  group: 'Ingresos'    },
  { name: 'Arriendo',           color: '#eab308', icon: '🏢', type: 'income',  group: 'Ingresos'    },
  { name: 'Otros ingresos',     color: '#6b7280', icon: '💰', type: 'income',  group: 'Ingresos'    },
  // Gastos empresa
  { name: 'Inventario/Insumos', color: '#f97316', icon: '📦', type: 'expense', group: 'Operación'   },
  { name: 'Sueldos/Nómina',     color: '#ef4444', icon: '👥', type: 'expense', group: 'Operación'   },
  { name: 'Arriendo local',     color: '#eab308', icon: '🏠', type: 'expense', group: 'Operación'   },
  { name: 'Servicios básicos',  color: '#06b6d4', icon: '💡', type: 'expense', group: 'Operación'   },
  { name: 'Marketing',          color: '#ec4899', icon: '📣', type: 'expense', group: 'Comercial'   },
  { name: 'Software/Tech',      color: '#6366f1', icon: '💻', type: 'expense', group: 'Comercial'   },
  { name: 'Transporte/Log.',    color: '#0ea5e9', icon: '🚛', type: 'expense', group: 'Logística'   },
  { name: 'Contab./Legal',      color: '#78716c', icon: '⚖️', type: 'expense', group: 'Admin'       },
  { name: 'Capacitación',       color: '#22c55e', icon: '🎓', type: 'expense', group: 'Admin'       },
  { name: 'Gastos varios',      color: '#6b7280', icon: '💸', type: 'expense', group: 'Admin'       },
];

async function seedBusinessCategories(db: Client) {
  const res = await db.execute('SELECT COUNT(*) as c FROM business_categories');
  const count = Number((res.rows[0] as any).c);
  if (count > 0) return;

  const stmts = BUSINESS_CATEGORIES.map((c) => ({
    sql: 'INSERT INTO business_categories (name, color, icon, type, group_label) VALUES (?, ?, ?, ?, ?)',
    args: [c.name, c.color, c.icon, c.type, c.group] as any[],
  }));
  await db.batch(stmts, 'write');
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

export async function updateTransaction(id: number, data: {
  type?: string; amount?: number; category_id?: number; description?: string; date?: string;
}) {
  const db = getClient();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = Object.values(data);
  await db.execute({ sql: `UPDATE transactions SET ${fields} WHERE id = ?`, args: [...values, id] });
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

// ── Debts ────────────────────────────────────────────────────────────────────
export async function getDebts() {
  const db = getClient();
  const res = await db.execute(`
    SELECT d.*,
      COALESCE((SELECT SUM(amount) FROM debt_payments WHERE debt_id = d.id), 0) as total_paid
    FROM debts d ORDER BY interest_rate DESC, current_balance ASC
  `);
  return toArr(res.rows);
}

export async function insertDebt(data: {
  name: string; total_amount: number; current_balance: number;
  interest_rate: number; minimum_payment: number; due_day?: number;
  color: string; icon: string;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: `INSERT INTO debts (name, total_amount, current_balance, interest_rate, minimum_payment, due_day, color, icon)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.name, data.total_amount, data.current_balance, data.interest_rate,
           data.minimum_payment, data.due_day ?? null, data.color, data.icon],
  });
  return res.lastInsertRowid;
}

export async function updateDebt(id: number, data: Partial<{
  name: string; current_balance: number; interest_rate: number;
  minimum_payment: number; due_day: number; color: string; icon: string;
}>) {
  const db = getClient();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = Object.values(data);
  await db.execute({ sql: `UPDATE debts SET ${fields} WHERE id = ?`, args: [...values, id] });
}

export async function deleteDebt(id: number) {
  const db = getClient();
  await db.batch([
    { sql: 'DELETE FROM debt_payments WHERE debt_id = ?', args: [id] },
    { sql: 'DELETE FROM debts WHERE id = ?', args: [id] },
  ], 'write');
}

// ── Debt Payments ─────────────────────────────────────────────────────────────
export async function getDebtPayments(debtId: number) {
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC',
    args: [debtId],
  });
  return toArr(res.rows);
}

export async function insertDebtPayment(debtId: number, amount: number, date: string, note?: string) {
  const db = getClient();
  // Insert payment and reduce balance
  const res = await db.execute({
    sql: 'INSERT INTO debt_payments (debt_id, amount, date, note) VALUES (?, ?, ?, ?)',
    args: [debtId, amount, date, note ?? null],
  });
  await db.execute({
    sql: 'UPDATE debts SET current_balance = MAX(0, current_balance - ?) WHERE id = ?',
    args: [amount, debtId],
  });
  return res.lastInsertRowid;
}

// ── Recurring Expenses ────────────────────────────────────────────────────────
export async function getRecurringExpenses(onlyActive = false) {
  const db = getClient();
  const res = onlyActive
    ? await db.execute(`
        SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM recurring_expenses r LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.is_active = 1 ORDER BY r.day_of_month ASC`)
    : await db.execute(`
        SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM recurring_expenses r LEFT JOIN categories c ON r.category_id = c.id
        ORDER BY r.is_active DESC, r.day_of_month ASC`);
  return toArr(res.rows);
}

export async function insertRecurringExpense(data: {
  name: string; amount: number; category_id?: number;
  day_of_month: number; color: string; icon: string;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: `INSERT INTO recurring_expenses (name, amount, category_id, day_of_month, color, icon)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [data.name, data.amount, data.category_id ?? null, data.day_of_month, data.color, data.icon],
  });
  return res.lastInsertRowid;
}

export async function updateRecurringExpense(id: number, data: Partial<{
  name: string; amount: number; category_id: number; day_of_month: number;
  color: string; icon: string; is_active: number;
}>) {
  const db = getClient();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = Object.values(data);
  await db.execute({ sql: `UPDATE recurring_expenses SET ${fields} WHERE id = ?`, args: [...values, id] });
}

export async function deleteRecurringExpense(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM recurring_expenses WHERE id = ?', args: [id] });
}

export async function getMonthlyRecurringTotal() {
  const db = getClient();
  const res = await db.execute('SELECT COALESCE(SUM(amount), 0) as total FROM recurring_expenses WHERE is_active = 1');
  return Number((res.rows[0] as any).total);
}

// ── Business Categories ───────────────────────────────────────────────────────
export async function getBusinessCategories(type?: string) {
  const db = getClient();
  const res = type
    ? await db.execute({ sql: 'SELECT * FROM business_categories WHERE type = ? ORDER BY group_label, name', args: [type] })
    : await db.execute('SELECT * FROM business_categories ORDER BY type, group_label, name');
  return toArr(res.rows);
}

// ── Business Transactions ─────────────────────────────────────────────────────
export async function getBusinessTransactions(year: number, month: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT bt.*, bc.name as category_name, bc.color as category_color, bc.icon as category_icon
          FROM business_transactions bt
          LEFT JOIN business_categories bc ON bt.category_id = bc.id
          WHERE strftime('%Y-%m', bt.date) = ?
          ORDER BY bt.date DESC, bt.created_at DESC`,
    args: [`${year}-${monthStr}`],
  });
  return toArr(res.rows);
}

export async function getAllBusinessTransactions(limit = 100) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT bt.*, bc.name as category_name, bc.color as category_color, bc.icon as category_icon
          FROM business_transactions bt
          LEFT JOIN business_categories bc ON bt.category_id = bc.id
          ORDER BY bt.date DESC, bt.created_at DESC LIMIT ?`,
    args: [limit],
  });
  return toArr(res.rows);
}

export async function insertBusinessTransaction(data: {
  type: string; gross_amount: number; net_amount: number; tax_amount: number;
  has_iva: number; category_id?: number; description?: string;
  date: string; document_type: string;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: `INSERT INTO business_transactions
            (type, gross_amount, net_amount, tax_amount, has_iva, category_id, description, date, document_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.type, data.gross_amount, data.net_amount, data.tax_amount,
      data.has_iva, data.category_id ?? null, data.description ?? '',
      data.date, data.document_type,
    ],
  });
  return res.lastInsertRowid;
}

export async function updateBusinessTransaction(id: number, data: Partial<{
  type: string; gross_amount: number; net_amount: number; tax_amount: number;
  has_iva: number; category_id: number; description: string; date: string; document_type: string;
}>) {
  const db = getClient();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = Object.values(data);
  await db.execute({ sql: `UPDATE business_transactions SET ${fields} WHERE id = ?`, args: [...values, id] });
}

export async function deleteBusinessTransaction(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM business_transactions WHERE id = ?', args: [id] });
}

// ── Business Summary ──────────────────────────────────────────────────────────
export async function getBusinessMonthlySummary(year: number, month: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const ym = `${year}-${monthStr}`;

  const res = await db.execute({
    sql: `SELECT
            COALESCE(SUM(CASE WHEN type='income' THEN net_amount ELSE 0 END), 0)  AS income_net,
            COALESCE(SUM(CASE WHEN type='income' THEN gross_amount ELSE 0 END), 0) AS income_gross,
            COALESCE(SUM(CASE WHEN type='expense' THEN net_amount ELSE 0 END), 0) AS expense_net,
            COALESCE(SUM(CASE WHEN type='expense' THEN gross_amount ELSE 0 END), 0) AS expense_gross,
            COALESCE(SUM(CASE WHEN type='income'  AND has_iva=1 THEN tax_amount ELSE 0 END), 0) AS iva_debito,
            COALESCE(SUM(CASE WHEN type='expense' AND has_iva=1 THEN tax_amount ELSE 0 END), 0) AS iva_credito
          FROM business_transactions
          WHERE strftime('%Y-%m', date) = ?`,
    args: [ym],
  });
  return { ...res.rows[0] } as any;
}

export async function getBusinessSpendingByCategory(year: number, month: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT bc.id, bc.name, bc.color, bc.icon, bc.group_label,
                 COALESCE(SUM(bt.net_amount), 0) as total
          FROM business_categories bc
          LEFT JOIN business_transactions bt ON bt.category_id = bc.id
            AND strftime('%Y-%m', bt.date) = ? AND bt.type = 'expense'
          WHERE bc.type = 'expense'
          GROUP BY bc.id ORDER BY total DESC`,
    args: [`${year}-${monthStr}`],
  });
  return toArr(res.rows);
}

export async function getBusinessMonthlyHistory(months = 6) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT strftime('%Y-%m', date) as month,
                 SUM(CASE WHEN type='income' THEN net_amount ELSE 0 END)  as income,
                 SUM(CASE WHEN type='expense' THEN net_amount ELSE 0 END) as expenses,
                 SUM(CASE WHEN type='income' AND has_iva=1 THEN tax_amount ELSE 0 END) as iva_debito,
                 SUM(CASE WHEN type='expense' AND has_iva=1 THEN tax_amount ELSE 0 END) as iva_credito
          FROM business_transactions
          WHERE date >= date('now', '-' || ? || ' months')
          GROUP BY month ORDER BY month ASC`,
    args: [months],
  });
  return toArr(res.rows);
}

// ── Tax Periods ───────────────────────────────────────────────────────────────
export async function getTaxPeriod(year: number, month: number) {
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT * FROM tax_periods WHERE year = ? AND month = ?',
    args: [year, month],
  });
  return res.rows[0] ? { ...res.rows[0] } : null;
}

export async function upsertTaxPeriod(year: number, month: number, data: {
  ppm_rate?: number; is_declared?: number; notes?: string;
}) {
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO tax_periods (year, month, ppm_rate, is_declared, notes)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(month, year) DO UPDATE SET
            ppm_rate    = COALESCE(excluded.ppm_rate, ppm_rate),
            is_declared = COALESCE(excluded.is_declared, is_declared),
            notes       = COALESCE(excluded.notes, notes)`,
    args: [year, month, data.ppm_rate ?? 1.0, data.is_declared ?? 0, data.notes ?? null],
  });
}

export async function getTaxYearSummary(year: number) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT
            strftime('%m', date) as month,
            SUM(CASE WHEN type='income' AND has_iva=1 THEN tax_amount ELSE 0 END)  AS iva_debito,
            SUM(CASE WHEN type='expense' AND has_iva=1 THEN tax_amount ELSE 0 END) AS iva_credito,
            SUM(CASE WHEN type='income' THEN net_amount ELSE 0 END)                AS net_income
          FROM business_transactions
          WHERE strftime('%Y', date) = ?
          GROUP BY month ORDER BY month ASC`,
    args: [String(year)],
  });
  return toArr(res.rows);
}
