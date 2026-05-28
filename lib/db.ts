import { createClient, type Client } from '@libsql/client';

let client: Client;

export function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL no configurada');
    client = createClient({ url, authToken: authToken || undefined });
  }
  return client;
}

// ── Schema & Seed ───────────────────────────────────────────────────────────
export async function initDb() {
  const db = getClient();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      display_name  TEXT    NOT NULL,
      password_hash TEXT    NOT NULL,
      is_admin      INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL,
      icon        TEXT NOT NULL,
      type        TEXT NOT NULL,
      group_label TEXT
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL DEFAULT 1,
      type        TEXT    NOT NULL,
      amount      REAL    NOT NULL,
      category_id INTEGER,
      description TEXT,
      date        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL DEFAULT 1,
      category_id  INTEGER NOT NULL,
      month        INTEGER NOT NULL,
      year         INTEGER NOT NULL,
      limit_amount REAL    NOT NULL,
      UNIQUE(user_id, category_id, month, year)
    );
    CREATE TABLE IF NOT EXISTS weekly_budgets (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL DEFAULT 1,
      week_start   TEXT    NOT NULL,
      limit_amount REAL    NOT NULL,
      note         TEXT,
      UNIQUE(user_id, week_start)
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL DEFAULT 1,
      type         TEXT    NOT NULL,
      message      TEXT    NOT NULL,
      is_read      INTEGER NOT NULL DEFAULT 0,
      triggered_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS investment_queries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL DEFAULT 1,
      query      TEXT    NOT NULL,
      response   TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS debts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL DEFAULT 1,
      name            TEXT    NOT NULL,
      total_amount    REAL    NOT NULL,
      current_balance REAL    NOT NULL,
      interest_rate   REAL    NOT NULL DEFAULT 0,
      minimum_payment REAL    NOT NULL DEFAULT 0,
      due_day         INTEGER,
      color           TEXT    NOT NULL DEFAULT '#ef4444',
      icon            TEXT    NOT NULL DEFAULT '💳',
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS debt_payments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id    INTEGER NOT NULL,
      amount     REAL    NOT NULL,
      date       TEXT    NOT NULL,
      note       TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL DEFAULT 1,
      name         TEXT    NOT NULL,
      amount       REAL    NOT NULL,
      category_id  INTEGER,
      day_of_month INTEGER NOT NULL DEFAULT 1,
      color        TEXT    NOT NULL DEFAULT '#6366f1',
      icon         TEXT    NOT NULL DEFAULT '🔄',
      is_active    INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS companies (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL DEFAULT 1,
      name              TEXT    NOT NULL,
      legal_type        TEXT    NOT NULL DEFAULT 'SPA',
      rut               TEXT,
      color             TEXT    NOT NULL DEFAULT '#10b981',
      icon              TEXT    NOT NULL DEFAULT '🏢',
      giro              TEXT,
      activity_category TEXT,
      is_active         INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS business_categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL,
      icon        TEXT NOT NULL,
      type        TEXT NOT NULL,
      group_label TEXT
    );
    CREATE TABLE IF NOT EXISTS business_transactions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id    INTEGER NOT NULL DEFAULT 1,
      type          TEXT    NOT NULL,
      gross_amount  REAL    NOT NULL,
      net_amount    REAL    NOT NULL,
      tax_amount    REAL    NOT NULL DEFAULT 0,
      has_iva       INTEGER NOT NULL DEFAULT 0,
      category_id   INTEGER,
      description   TEXT,
      date          TEXT    NOT NULL,
      document_type TEXT    NOT NULL DEFAULT 'boleta',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tax_periods (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      month       INTEGER NOT NULL,
      year        INTEGER NOT NULL,
      company_id  INTEGER NOT NULL DEFAULT 1,
      ppm_rate    REAL    NOT NULL DEFAULT 1.0,
      is_declared INTEGER NOT NULL DEFAULT 0,
      notes       TEXT,
      UNIQUE(month, year, company_id)
    );
  `);

  await seedCategories(db);
  await seedBusinessCategories(db);
  await runMigrations(db);
}

// ── Migrations ───────────────────────────────────────────────────────────────
async function runMigrations(db: Client) {
  // 1. Add columns to pre-existing tables (safe – throws if already exists)
  const columnAdds = [
    `ALTER TABLE transactions        ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE alerts              ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE investment_queries  ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE debts               ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE recurring_expenses  ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE companies           ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE companies           ADD COLUMN giro TEXT`,
    `ALTER TABLE companies           ADD COLUMN activity_category TEXT`,
    `ALTER TABLE business_transactions ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE tax_periods         ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1`,
  ];
  for (const sql of columnAdds) {
    try { await db.execute(sql); } catch { /* already exists – ignore */ }
  }

  // 2. Recreate budgets with user_id in UNIQUE constraint
  await recreateTableWithUserId(db, 'budgets', `
    CREATE TABLE IF NOT EXISTS budgets_v2 (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL DEFAULT 1,
      category_id  INTEGER NOT NULL,
      month        INTEGER NOT NULL,
      year         INTEGER NOT NULL,
      limit_amount REAL    NOT NULL,
      UNIQUE(user_id, category_id, month, year)
    );
    INSERT OR IGNORE INTO budgets_v2 (id, user_id, category_id, month, year, limit_amount)
      SELECT id, COALESCE(user_id,1), category_id, month, year, limit_amount FROM budgets;
    DROP TABLE budgets;
    ALTER TABLE budgets_v2 RENAME TO budgets;
  `);

  // 3. Recreate weekly_budgets with user_id in UNIQUE constraint
  await recreateTableWithUserId(db, 'weekly_budgets', `
    CREATE TABLE IF NOT EXISTS weekly_budgets_v2 (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL DEFAULT 1,
      week_start   TEXT    NOT NULL,
      limit_amount REAL    NOT NULL,
      note         TEXT,
      UNIQUE(user_id, week_start)
    );
    INSERT OR IGNORE INTO weekly_budgets_v2 (id, user_id, week_start, limit_amount, note)
      SELECT id, COALESCE(user_id,1), week_start, limit_amount, note FROM weekly_budgets;
    DROP TABLE weekly_budgets;
    ALTER TABLE weekly_budgets_v2 RENAME TO weekly_budgets;
  `);

  // 4. Fix tax_periods UNIQUE constraint (old: month,year → new: month,year,company_id)
  await recreateTableWithUserId(db, 'tax_periods', `
    CREATE TABLE IF NOT EXISTS tax_periods_v2 (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      month       INTEGER NOT NULL,
      year        INTEGER NOT NULL,
      company_id  INTEGER NOT NULL DEFAULT 1,
      ppm_rate    REAL    NOT NULL DEFAULT 1.0,
      is_declared INTEGER NOT NULL DEFAULT 0,
      notes       TEXT,
      UNIQUE(month, year, company_id)
    );
    INSERT OR IGNORE INTO tax_periods_v2 (id, month, year, company_id, ppm_rate, is_declared, notes)
      SELECT id, month, year, COALESCE(company_id,1), ppm_rate, is_declared, notes FROM tax_periods;
    DROP TABLE tax_periods;
    ALTER TABLE tax_periods_v2 RENAME TO tax_periods;
  `, 'UNIQUE(month, year, company_id)');
}

/** Recreates a table only if the current schema doesn't contain `marker` (default: 'user_id') */
async function recreateTableWithUserId(
  db: Client,
  tableName: string,
  migrationSql: string,
  marker = 'user_id'
) {
  try {
    const r = await db.execute(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [tableName]
    );
    const sql: string = (r.rows[0]?.sql as string) ?? '';
    if (!sql.includes(marker)) {
      await db.executeMultiple(migrationSql);
    }
  } catch { /* table doesn't exist or migration already done */ }
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const BUSINESS_CATEGORIES = [
  { name: 'Venta productos',    color: '#16a34a', icon: '🛒', type: 'income',  group: 'Ingresos'  },
  { name: 'Servicios',          color: '#3b82f6', icon: '🔧', type: 'income',  group: 'Ingresos'  },
  { name: 'Consultoría',        color: '#8b5cf6', icon: '💼', type: 'income',  group: 'Ingresos'  },
  { name: 'Arriendo',           color: '#eab308', icon: '🏢', type: 'income',  group: 'Ingresos'  },
  { name: 'Otros ingresos',     color: '#6b7280', icon: '💰', type: 'income',  group: 'Ingresos'  },
  { name: 'Inventario/Insumos', color: '#f97316', icon: '📦', type: 'expense', group: 'Operación' },
  { name: 'Sueldos/Nómina',     color: '#ef4444', icon: '👥', type: 'expense', group: 'Operación' },
  { name: 'Arriendo local',     color: '#eab308', icon: '🏠', type: 'expense', group: 'Operación' },
  { name: 'Servicios básicos',  color: '#06b6d4', icon: '💡', type: 'expense', group: 'Operación' },
  { name: 'Marketing',          color: '#ec4899', icon: '📣', type: 'expense', group: 'Comercial' },
  { name: 'Software/Tech',      color: '#6366f1', icon: '💻', type: 'expense', group: 'Comercial' },
  { name: 'Transporte/Log.',    color: '#0ea5e9', icon: '🚛', type: 'expense', group: 'Logística' },
  { name: 'Contab./Legal',      color: '#78716c', icon: '⚖️', type: 'expense', group: 'Admin'     },
  { name: 'Capacitación',       color: '#22c55e', icon: '🎓', type: 'expense', group: 'Admin'     },
  { name: 'Gastos varios',      color: '#6b7280', icon: '💸', type: 'expense', group: 'Admin'     },
];

async function seedBusinessCategories(db: Client) {
  const res = await db.execute('SELECT COUNT(*) as c FROM business_categories');
  if (Number((res.rows[0] as any).c) > 0) return;
  const stmts = BUSINESS_CATEGORIES.map((c) => ({
    sql: 'INSERT INTO business_categories (name, color, icon, type, group_label) VALUES (?, ?, ?, ?, ?)',
    args: [c.name, c.color, c.icon, c.type, c.group] as any[],
  }));
  await db.batch(stmts, 'write');
}

const CATEGORIES = [
  { name: 'Supermercado',           color: '#16a34a', icon: '🛒', type: 'expense', group: 'Compras'    },
  { name: 'Verdulería/Feria',       color: '#4ade80', icon: '🥦', type: 'expense', group: 'Compras'    },
  { name: 'Café & Colaciones',      color: '#f59e0b', icon: '☕', type: 'expense', group: 'Diario'     },
  { name: 'Transporte diario',      color: '#3b82f6', icon: '🚌', type: 'expense', group: 'Transporte' },
  { name: 'Combustible',            color: '#1d4ed8', icon: '⛽', type: 'expense', group: 'Transporte' },
  { name: 'Arriendo/Hipoteca',      color: '#eab308', icon: '🏠', type: 'expense', group: 'Hogar'      },
  { name: 'Servicios básicos',      color: '#06b6d4', icon: '💡', type: 'expense', group: 'Hogar'      },
  { name: 'Hogar & Mantención',     color: '#78716c', icon: '🔧', type: 'expense', group: 'Hogar'      },
  { name: 'Salud & Farmacia',       color: '#22c55e', icon: '💊', type: 'expense', group: 'Salud'      },
  { name: 'Restaurantes & Salidas', color: '#f97316', icon: '🍽️', type: 'expense', group: 'Ocio'      },
  { name: 'Entrete & Ocio',         color: '#a855f7', icon: '🎬', type: 'expense', group: 'Ocio'       },
  { name: 'Suscripciones',          color: '#8b5cf6', icon: '📱', type: 'expense', group: 'Ocio'       },
  { name: 'Ropa & Calzado',         color: '#ec4899', icon: '👕', type: 'expense', group: 'Personal'   },
  { name: 'Educación',              color: '#2563eb', icon: '🎓', type: 'expense', group: 'Personal'   },
  { name: 'Gastos varios',          color: '#6b7280', icon: '💸', type: 'expense', group: 'Otros'      },
  { name: 'Salario',                color: '#22c55e', icon: '💼', type: 'income',  group: 'Trabajo'    },
  { name: 'Freelance/Extra',        color: '#10b981', icon: '💻', type: 'income',  group: 'Trabajo'    },
  { name: 'Inversiones',            color: '#3b82f6', icon: '📈', type: 'income',  group: 'Finanzas'   },
  { name: 'Ahorro retirado',        color: '#0284c7', icon: '🏦', type: 'income',  group: 'Finanzas'   },
  { name: 'Otros ingresos',         color: '#6b7280', icon: '💰', type: 'income',  group: 'Otros'      },
];

async function seedCategories(db: Client) {
  const res = await db.execute('SELECT COUNT(*) as c FROM categories');
  if (Number((res.rows[0] as any).c) > 0) return;
  const stmts = CATEGORIES.map((c) => ({
    sql: 'INSERT INTO categories (name, color, icon, type, group_label) VALUES (?, ?, ?, ?, ?)',
    args: [c.name, c.color, c.icon, c.type, c.group] as any[],
  }));
  await db.batch(stmts, 'write');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getUserCount(): Promise<number> {
  const db = getClient();
  const res = await db.execute('SELECT COUNT(*) as c FROM users');
  return Number((res.rows[0] as any).c);
}

export async function getUsers() {
  const db = getClient();
  const res = await db.execute(
    'SELECT id, username, display_name, is_admin, created_at FROM users ORDER BY id ASC'
  );
  return toArr(res.rows);
}

export async function getUserByUsername(username: string) {
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [username],
  });
  return res.rows[0] ? { ...res.rows[0] } as any : null;
}

export async function insertUser(data: {
  username: string; displayName: string; passwordHash: string; isAdmin: boolean;
}): Promise<number> {
  const db = getClient();
  const res = await db.execute({
    sql: `INSERT INTO users (username, display_name, password_hash, is_admin)
          VALUES (?, ?, ?, ?)`,
    args: [data.username, data.displayName, data.passwordHash, data.isAdmin ? 1 : 0],
  });
  return Number(res.lastInsertRowid);
}

export async function deleteUser(id: number) {
  const db = getClient();
  // Cascade delete all personal data for this user
  await db.batch([
    { sql: 'DELETE FROM transactions       WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM budgets            WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM weekly_budgets     WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM alerts             WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM investment_queries WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM recurring_expenses WHERE user_id = ?', args: [id] },
    // Debts + their payments
    { sql: 'DELETE FROM debt_payments WHERE debt_id IN (SELECT id FROM debts WHERE user_id = ?)', args: [id] },
    { sql: 'DELETE FROM debts              WHERE user_id = ?', args: [id] },
    // Companies + business data
    { sql: 'DELETE FROM business_transactions WHERE company_id IN (SELECT id FROM companies WHERE user_id = ?)', args: [id] },
    { sql: 'DELETE FROM tax_periods           WHERE company_id IN (SELECT id FROM companies WHERE user_id = ?)', args: [id] },
    { sql: 'DELETE FROM companies             WHERE user_id = ?', args: [id] },
    // Finally the user
    { sql: 'DELETE FROM users WHERE id = ?', args: [id] },
  ], 'write');
}

// ── Transactions ──────────────────────────────────────────────────────────────
export async function getTransactions(userId: number, limit = 50, offset = 0) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = ?
          ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`,
    args: [userId, limit, offset],
  });
  return toArr(res.rows);
}

export async function getTransactionsByMonth(userId: number, year: number, month: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = ? AND strftime('%Y-%m', t.date) = ?
          ORDER BY t.date DESC`,
    args: [userId, `${year}-${monthStr}`],
  });
  return toArr(res.rows);
}

export async function insertTransaction(data: {
  userId: number; type: string; amount: number;
  category_id: number; description: string; date: string;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: 'INSERT INTO transactions (user_id, type, amount, category_id, description, date) VALUES (?, ?, ?, ?, ?, ?)',
    args: [data.userId, data.type, data.amount, data.category_id, data.description, data.date],
  });
  return res.lastInsertRowid;
}

export async function updateTransaction(id: number, data: {
  type?: string; amount?: number; category_id?: number; description?: string; date?: string;
}) {
  const db = getClient();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  await db.execute({ sql: `UPDATE transactions SET ${fields} WHERE id = ?`, args: [...Object.values(data), id] });
}

export async function deleteTransaction(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM transactions WHERE id = ?', args: [id] });
}

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(type?: string) {
  const db = getClient();
  const res = type
    ? await db.execute({ sql: 'SELECT * FROM categories WHERE type = ? ORDER BY group_label, name', args: [type] })
    : await db.execute('SELECT * FROM categories ORDER BY type, group_label, name');
  return toArr(res.rows);
}

// ── Monthly Budgets ───────────────────────────────────────────────────────────
export async function getBudgets(userId: number, year: number, month: number) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT b.*, c.name as category_name, c.color as category_color,
                 c.icon as category_icon, c.group_label as category_group
          FROM budgets b JOIN categories c ON b.category_id = c.id
          WHERE b.user_id = ? AND b.year = ? AND b.month = ?
          ORDER BY c.group_label, c.name`,
    args: [userId, year, month],
  });
  return toArr(res.rows);
}

export async function upsertBudget(userId: number, category_id: number, month: number, year: number, limit_amount: number) {
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO budgets (user_id, category_id, month, year, limit_amount) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, category_id, month, year) DO UPDATE SET limit_amount = excluded.limit_amount`,
    args: [userId, category_id, month, year, limit_amount],
  });
}

export async function deleteBudget(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM budgets WHERE id = ?', args: [id] });
}

// ── Weekly Budgets ────────────────────────────────────────────────────────────
export async function getWeeklyBudget(userId: number, weekStart: string) {
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT * FROM weekly_budgets WHERE user_id = ? AND week_start = ?',
    args: [userId, weekStart],
  });
  return res.rows[0] ? { ...res.rows[0] } : undefined;
}

export async function upsertWeeklyBudget(userId: number, weekStart: string, limit_amount: number, note?: string) {
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO weekly_budgets (user_id, week_start, limit_amount, note) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, week_start) DO UPDATE SET limit_amount = excluded.limit_amount, note = excluded.note`,
    args: [userId, weekStart, limit_amount, note ?? null],
  });
}

export async function deleteWeeklyBudget(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM weekly_budgets WHERE id = ?', args: [id] });
}

export async function getWeeklySpendingByDay(userId: number, weekStart: string) {
  const db = getClient();
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().split('T')[0];
  const res = await db.execute({
    sql: `SELECT date, SUM(amount) as total FROM transactions
          WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
          GROUP BY date ORDER BY date ASC`,
    args: [userId, weekStart, endStr],
  });
  return toArr(res.rows) as Array<{ date: string; total: number }>;
}

export async function getWeeklySpendingByCategory(userId: number, weekStart: string) {
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
            AND t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
          WHERE c.type = 'expense'
          GROUP BY c.id HAVING total > 0 ORDER BY total DESC`,
    args: [userId, weekStart, endStr],
  });
  return toArr(res.rows);
}

// ── Spending by category ──────────────────────────────────────────────────────
export async function getSpendingByCategory(userId: number, year: number, month: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT c.id, c.name, c.color, c.icon, COALESCE(SUM(t.amount), 0) as total
          FROM categories c
          LEFT JOIN transactions t ON t.category_id = c.id
            AND t.user_id = ? AND strftime('%Y-%m', t.date) = ? AND t.type = 'expense'
          WHERE c.type = 'expense'
          GROUP BY c.id ORDER BY total DESC`,
    args: [userId, `${year}-${monthStr}`],
  });
  return toArr(res.rows);
}

// ── Projections ───────────────────────────────────────────────────────────────
export async function getMonthlySummary(userId: number, months = 6) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT strftime('%Y-%m', date) as month,
                 SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
                 SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
          FROM transactions
          WHERE user_id = ? AND date >= date('now', '-' || ? || ' months')
          GROUP BY month ORDER BY month ASC`,
    args: [userId, months],
  });
  return toArr(res.rows);
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export async function getAlerts(userId: number, onlyUnread = false) {
  const db = getClient();
  const res = onlyUnread
    ? await db.execute({ sql: 'SELECT * FROM alerts WHERE user_id = ? AND is_read=0 ORDER BY triggered_at DESC', args: [userId] })
    : await db.execute({ sql: 'SELECT * FROM alerts WHERE user_id = ? ORDER BY triggered_at DESC LIMIT 50', args: [userId] });
  return toArr(res.rows);
}

export async function insertAlert(userId: number, type: string, message: string) {
  const db = getClient();
  await db.execute({ sql: 'INSERT INTO alerts (user_id, type, message) VALUES (?, ?, ?)', args: [userId, type, message] });
}

export async function markAlertRead(id: number) {
  const db = getClient();
  await db.execute({ sql: 'UPDATE alerts SET is_read=1 WHERE id=?', args: [id] });
}

export async function markAllAlertsRead(userId: number) {
  const db = getClient();
  await db.execute({ sql: 'UPDATE alerts SET is_read=1 WHERE user_id=?', args: [userId] });
}

export async function getUnreadAlertCount(userId: number) {
  const db = getClient();
  const res = await db.execute({ sql: 'SELECT COUNT(*) as c FROM alerts WHERE user_id=? AND is_read=0', args: [userId] });
  return Number((res.rows[0] as any).c);
}

// ── Investment queries ────────────────────────────────────────────────────────
export async function getInvestmentQueries(userId: number) {
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT * FROM investment_queries WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    args: [userId],
  });
  return toArr(res.rows);
}

export async function insertInvestmentQuery(userId: number, query: string, response: string) {
  const db = getClient();
  await db.execute({ sql: 'INSERT INTO investment_queries (user_id, query, response) VALUES (?, ?, ?)', args: [userId, query, response] });
}

// ── Debts ─────────────────────────────────────────────────────────────────────
export async function getDebts(userId: number) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT d.*,
            COALESCE((SELECT SUM(amount) FROM debt_payments WHERE debt_id = d.id), 0) as total_paid
          FROM debts d WHERE d.user_id = ? ORDER BY interest_rate DESC, current_balance ASC`,
    args: [userId],
  });
  return toArr(res.rows);
}

export async function insertDebt(data: {
  userId: number; name: string; total_amount: number; current_balance: number;
  interest_rate: number; minimum_payment: number; due_day?: number;
  color: string; icon: string;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: `INSERT INTO debts (user_id, name, total_amount, current_balance, interest_rate, minimum_payment, due_day, color, icon)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.userId, data.name, data.total_amount, data.current_balance,
           data.interest_rate, data.minimum_payment, data.due_day ?? null, data.color, data.icon],
  });
  return res.lastInsertRowid;
}

export async function updateDebt(id: number, data: Partial<{
  name: string; current_balance: number; interest_rate: number;
  minimum_payment: number; due_day: number; color: string; icon: string;
}>) {
  const db = getClient();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  await db.execute({ sql: `UPDATE debts SET ${fields} WHERE id = ?`, args: [...Object.values(data), id] });
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
  const res = await db.execute({ sql: 'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC', args: [debtId] });
  return toArr(res.rows);
}

export async function insertDebtPayment(debtId: number, amount: number, date: string, note?: string) {
  const db = getClient();
  const res = await db.execute({
    sql: 'INSERT INTO debt_payments (debt_id, amount, date, note) VALUES (?, ?, ?, ?)',
    args: [debtId, amount, date, note ?? null],
  });
  await db.execute({ sql: 'UPDATE debts SET current_balance = MAX(0, current_balance - ?) WHERE id = ?', args: [amount, debtId] });
  return res.lastInsertRowid;
}

// ── Recurring Expenses ────────────────────────────────────────────────────────
export async function getRecurringExpenses(userId: number, onlyActive = false) {
  const db = getClient();
  const res = onlyActive
    ? await db.execute({
        sql: `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
              FROM recurring_expenses r LEFT JOIN categories c ON r.category_id = c.id
              WHERE r.user_id = ? AND r.is_active = 1 ORDER BY r.day_of_month ASC`,
        args: [userId],
      })
    : await db.execute({
        sql: `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
              FROM recurring_expenses r LEFT JOIN categories c ON r.category_id = c.id
              WHERE r.user_id = ? ORDER BY r.is_active DESC, r.day_of_month ASC`,
        args: [userId],
      });
  return toArr(res.rows);
}

export async function insertRecurringExpense(data: {
  userId: number; name: string; amount: number; category_id?: number;
  day_of_month: number; color: string; icon: string;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: `INSERT INTO recurring_expenses (user_id, name, amount, category_id, day_of_month, color, icon)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [data.userId, data.name, data.amount, data.category_id ?? null, data.day_of_month, data.color, data.icon],
  });
  return res.lastInsertRowid;
}

export async function updateRecurringExpense(id: number, data: Partial<{
  name: string; amount: number; category_id: number; day_of_month: number;
  color: string; icon: string; is_active: number;
}>) {
  const db = getClient();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  await db.execute({ sql: `UPDATE recurring_expenses SET ${fields} WHERE id = ?`, args: [...Object.values(data), id] });
}

export async function deleteRecurringExpense(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM recurring_expenses WHERE id = ?', args: [id] });
}

export async function getMonthlyRecurringTotal(userId: number) {
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT COALESCE(SUM(amount), 0) as total FROM recurring_expenses WHERE user_id = ? AND is_active = 1',
    args: [userId],
  });
  return Number((res.rows[0] as any).total);
}

// ── Companies ─────────────────────────────────────────────────────────────────
export async function getCompanies(userId: number) {
  const db = getClient();
  const res = await db.execute({ sql: 'SELECT * FROM companies WHERE user_id = ? ORDER BY created_at ASC', args: [userId] });
  return toArr(res.rows);
}

export async function getCompany(id: number) {
  const db = getClient();
  const res = await db.execute({ sql: 'SELECT * FROM companies WHERE id = ?', args: [id] });
  return res.rows[0] ? { ...res.rows[0] } : null;
}

export async function insertCompany(data: {
  userId: number; name: string; legal_type: string; rut?: string;
  color: string; icon: string; giro?: string; activity_category?: string;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: `INSERT INTO companies (user_id, name, legal_type, rut, color, icon, giro, activity_category)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.userId, data.name, data.legal_type, data.rut ?? null,
           data.color, data.icon, data.giro ?? null, data.activity_category ?? null],
  });
  return Number(res.lastInsertRowid);
}

export async function updateCompany(id: number, data: Partial<{
  name: string; legal_type: string; rut: string; color: string; icon: string;
  giro: string; activity_category: string; is_active: number;
}>) {
  const db = getClient();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  await db.execute({ sql: `UPDATE companies SET ${fields} WHERE id = ?`, args: [...Object.values(data), id] });
}

export async function deleteCompany(id: number) {
  const db = getClient();
  await db.batch([
    { sql: 'DELETE FROM business_transactions WHERE company_id = ?', args: [id] },
    { sql: 'DELETE FROM tax_periods WHERE company_id = ?', args: [id] },
    { sql: 'DELETE FROM companies WHERE id = ?', args: [id] },
  ], 'write');
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
export async function getBusinessTransactions(year: number, month: number, companyId: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT bt.*, bc.name as category_name, bc.color as category_color, bc.icon as category_icon
          FROM business_transactions bt
          LEFT JOIN business_categories bc ON bt.category_id = bc.id
          WHERE strftime('%Y-%m', bt.date) = ? AND bt.company_id = ?
          ORDER BY bt.date DESC, bt.created_at DESC`,
    args: [`${year}-${monthStr}`, companyId],
  });
  return toArr(res.rows);
}

export async function getAllBusinessTransactions(companyId: number, limit = 200) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT bt.*, bc.name as category_name, bc.color as category_color, bc.icon as category_icon
          FROM business_transactions bt
          LEFT JOIN business_categories bc ON bt.category_id = bc.id
          WHERE bt.company_id = ?
          ORDER BY bt.date DESC, bt.created_at DESC LIMIT ?`,
    args: [companyId, limit],
  });
  return toArr(res.rows);
}

export async function insertBusinessTransaction(data: {
  type: string; gross_amount: number; net_amount: number; tax_amount: number;
  has_iva: number; category_id?: number; description?: string;
  date: string; document_type: string; company_id: number;
}) {
  const db = getClient();
  const res = await db.execute({
    sql: `INSERT INTO business_transactions
            (type, gross_amount, net_amount, tax_amount, has_iva, category_id, description, date, document_type, company_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.type, data.gross_amount, data.net_amount, data.tax_amount,
      data.has_iva, data.category_id ?? null, data.description ?? '',
      data.date, data.document_type, data.company_id,
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
  await db.execute({ sql: `UPDATE business_transactions SET ${fields} WHERE id = ?`, args: [...Object.values(data), id] });
}

export async function deleteBusinessTransaction(id: number) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM business_transactions WHERE id = ?', args: [id] });
}

// ── Business Summary ──────────────────────────────────────────────────────────
export async function getBusinessMonthlySummary(year: number, month: number, companyId: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT
            COALESCE(SUM(CASE WHEN type='income' THEN net_amount ELSE 0 END), 0)   AS income_net,
            COALESCE(SUM(CASE WHEN type='income' THEN gross_amount ELSE 0 END), 0)  AS income_gross,
            COALESCE(SUM(CASE WHEN type='expense' THEN net_amount ELSE 0 END), 0)  AS expense_net,
            COALESCE(SUM(CASE WHEN type='expense' THEN gross_amount ELSE 0 END), 0) AS expense_gross,
            COALESCE(SUM(CASE WHEN type='income'  AND has_iva=1 THEN tax_amount ELSE 0 END), 0) AS iva_debito,
            COALESCE(SUM(CASE WHEN type='expense' AND has_iva=1 THEN tax_amount ELSE 0 END), 0) AS iva_credito
          FROM business_transactions
          WHERE strftime('%Y-%m', date) = ? AND company_id = ?`,
    args: [`${year}-${monthStr}`, companyId],
  });
  return { ...res.rows[0] } as any;
}

export async function getBusinessSpendingByCategory(year: number, month: number, companyId: number) {
  const db = getClient();
  const monthStr = String(month).padStart(2, '0');
  const res = await db.execute({
    sql: `SELECT bc.id, bc.name, bc.color, bc.icon, bc.group_label,
                 COALESCE(SUM(bt.net_amount), 0) as total
          FROM business_categories bc
          LEFT JOIN business_transactions bt ON bt.category_id = bc.id
            AND strftime('%Y-%m', bt.date) = ? AND bt.type = 'expense' AND bt.company_id = ?
          WHERE bc.type = 'expense'
          GROUP BY bc.id ORDER BY total DESC`,
    args: [`${year}-${monthStr}`, companyId],
  });
  return toArr(res.rows);
}

export async function getBusinessMonthlyHistory(companyId: number, months = 6) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT strftime('%Y-%m', date) as month,
                 SUM(CASE WHEN type='income' THEN net_amount ELSE 0 END)  as income,
                 SUM(CASE WHEN type='expense' THEN net_amount ELSE 0 END) as expenses,
                 SUM(CASE WHEN type='income' AND has_iva=1 THEN tax_amount ELSE 0 END) as iva_debito,
                 SUM(CASE WHEN type='expense' AND has_iva=1 THEN tax_amount ELSE 0 END) as iva_credito
          FROM business_transactions
          WHERE date >= date('now', '-' || ? || ' months') AND company_id = ?
          GROUP BY month ORDER BY month ASC`,
    args: [months, companyId],
  });
  return toArr(res.rows);
}

// ── Tax Periods ───────────────────────────────────────────────────────────────
export async function getTaxPeriod(year: number, month: number, companyId: number) {
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT * FROM tax_periods WHERE year = ? AND month = ? AND company_id = ?',
    args: [year, month, companyId],
  });
  return res.rows[0] ? { ...res.rows[0] } : null;
}

export async function upsertTaxPeriod(year: number, month: number, companyId: number, data: {
  ppm_rate?: number; is_declared?: number; notes?: string;
}) {
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO tax_periods (year, month, company_id, ppm_rate, is_declared, notes)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(month, year, company_id) DO UPDATE SET
            ppm_rate    = COALESCE(excluded.ppm_rate, ppm_rate),
            is_declared = COALESCE(excluded.is_declared, is_declared),
            notes       = COALESCE(excluded.notes, notes)`,
    args: [year, month, companyId, data.ppm_rate ?? 1.0, data.is_declared ?? 0, data.notes ?? null],
  });
}

export async function getTaxYearSummary(year: number, companyId: number) {
  const db = getClient();
  const res = await db.execute({
    sql: `SELECT
            strftime('%m', date) as month,
            SUM(CASE WHEN type='income' AND has_iva=1 THEN tax_amount ELSE 0 END)  AS iva_debito,
            SUM(CASE WHEN type='expense' AND has_iva=1 THEN tax_amount ELSE 0 END) AS iva_credito,
            SUM(CASE WHEN type='income' THEN net_amount ELSE 0 END)                AS net_income
          FROM business_transactions
          WHERE strftime('%Y', date) = ? AND company_id = ?
          GROUP BY month ORDER BY month ASC`,
    args: [String(year), companyId],
  });
  return toArr(res.rows);
}
