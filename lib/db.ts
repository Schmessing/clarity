import * as SQLite from 'expo-sqlite';
import type {
  Account, Transaction, Budget, BudgetProgress,
  CategorySummary, MonthlySummary, Category,
} from '../types/finance';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('clarity.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS accounts (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      type      TEXT NOT NULL,
      balance   REAL NOT NULL DEFAULT 0,
      currency  TEXT NOT NULL DEFAULT 'USD',
      color     TEXT NOT NULL DEFAULT '#6366f1',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId   INTEGER NOT NULL,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL,
      category    TEXT NOT NULL,
      merchant    TEXT NOT NULL,
      date        TEXT NOT NULL,
      note        TEXT,
      isRecurring INTEGER NOT NULL DEFAULT 0,
      imageUri    TEXT,
      items       TEXT,
      createdAt   TEXT NOT NULL,
      FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount   REAL NOT NULL,
      month    TEXT NOT NULL,
      UNIQUE(category, month)
    );
  `);

  // Seed a default account on first launch
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
  if (existing?.count === 0) {
    await db.runAsync(
      `INSERT INTO accounts (name, type, balance, currency, color, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      ['My Checking', 'checking', 0, 'USD', '#6366f1', new Date().toISOString()]
    );
  }
  return db;
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const database = await getDb();
  return database.getAllAsync<Account>('SELECT * FROM accounts ORDER BY createdAt ASC');
}

export async function insertAccount(a: Omit<Account, 'id'>): Promise<number> {
  const database = await getDb();
  const r = await database.runAsync(
    `INSERT INTO accounts (name, type, balance, currency, color, createdAt) VALUES (?,?,?,?,?,?)`,
    [a.name, a.type, a.balance, a.currency, a.color, a.createdAt]
  );
  return r.lastInsertRowId;
}

export async function updateAccountBalance(id: number, delta: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, id]);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function insertTransaction(t: Omit<Transaction, 'id'>): Promise<number> {
  const database = await getDb();
  const r = await database.runAsync(
    `INSERT INTO transactions
       (accountId, amount, type, category, merchant, date, note, isRecurring, imageUri, items, createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [t.accountId, t.amount, t.type, t.category, t.merchant, t.date,
     t.note ?? null, t.isRecurring, t.imageUri ?? null, t.items ?? null, t.createdAt]
  );
  // Update account balance
  const delta = t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0;
  if (delta !== 0) await updateAccountBalance(t.accountId, delta);
  return r.lastInsertRowId;
}

export async function deleteTransaction(id: number): Promise<void> {
  const database = await getDb();
  const t = await database.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!t) return;
  const delta = t.type === 'income' ? -t.amount : t.type === 'expense' ? t.amount : 0;
  if (delta !== 0) await updateAccountBalance(t.accountId, delta);
  await database.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function getTransactions(limit = 100, offset = 0): Promise<Transaction[]> {
  const database = await getDb();
  return database.getAllAsync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, createdAt DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
}

export async function getTransactionsByMonth(ym: string): Promise<Transaction[]> {
  const database = await getDb();
  return database.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC`,
    [ym]
  );
}

export async function getRecentTransactions(limit = 10): Promise<Transaction[]> {
  const database = await getDb();
  return database.getAllAsync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, createdAt DESC LIMIT ?',
    [limit]
  );
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export async function getBudgets(month: string): Promise<Budget[]> {
  const database = await getDb();
  return database.getAllAsync<Budget>('SELECT * FROM budgets WHERE month = ?', [month]);
}

export async function upsertBudget(b: Omit<Budget, 'id'>): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO budgets (category, amount, month) VALUES (?,?,?)
     ON CONFLICT(category, month) DO UPDATE SET amount = excluded.amount`,
    [b.category, b.amount, b.month]
  );
}

export async function deleteBudget(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

export async function getBudgetProgress(month: string): Promise<BudgetProgress[]> {
  const database = await getDb();
  const budgets = await getBudgets(month);
  const spending = await database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM transactions
     WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
     GROUP BY category`,
    [month]
  );
  const spendMap = new Map(spending.map((s) => [s.category, s.total]));
  return budgets.map((b) => {
    const spent = spendMap.get(b.category) ?? 0;
    return {
      ...b,
      spent,
      remaining: b.amount - spent,
      pct: b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0,
    };
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getCategorySummary(month: string): Promise<CategorySummary[]> {
  const database = await getDb();
  return database.getAllAsync<CategorySummary>(
    `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM transactions WHERE type='expense' AND strftime('%Y-%m', date) = ?
     GROUP BY category ORDER BY total DESC`,
    [month]
  );
}

export async function getMonthlySummaries(limit = 6): Promise<MonthlySummary[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ month: string; type: string; total: number }>(
    `SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
     FROM transactions GROUP BY month, type ORDER BY month DESC LIMIT ?`,
    [limit * 2]
  );
  const map = new Map<string, MonthlySummary>();
  for (const r of rows) {
    if (!map.has(r.month)) map.set(r.month, { month: r.month, income: 0, expenses: 0, net: 0 });
    const m = map.get(r.month)!;
    if (r.type === 'income') m.income += r.total;
    if (r.type === 'expense') m.expenses += r.total;
    m.net = m.income - m.expenses;
  }
  return Array.from(map.values()).slice(0, limit);
}

export async function getTotalNetWorth(): Promise<number> {
  const database = await getDb();
  const r = await database.getFirstAsync<{ total: number }>(
    `SELECT SUM(CASE WHEN type = 'credit' THEN -balance ELSE balance END) as total FROM accounts`
  );
  return r?.total ?? 0;
}
