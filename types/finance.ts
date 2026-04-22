export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';

export type TransactionType = 'expense' | 'income' | 'transfer';

export type Category =
  | 'Food & Dining'
  | 'Groceries'
  | 'Shopping'
  | 'Transport'
  | 'Entertainment'
  | 'Health'
  | 'Utilities'
  | 'Housing'
  | 'Income'
  | 'Savings'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Food & Dining', 'Groceries', 'Shopping', 'Transport',
  'Entertainment', 'Health', 'Utilities', 'Housing', 'Income', 'Savings', 'Other',
];

export const EXPENSE_CATEGORIES: Category[] = [
  'Food & Dining', 'Groceries', 'Shopping', 'Transport',
  'Entertainment', 'Health', 'Utilities', 'Housing', 'Other',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  'Food & Dining':  '#f97316',
  'Groceries':      '#22c55e',
  'Shopping':       '#a855f7',
  'Transport':      '#3b82f6',
  'Entertainment':  '#ec4899',
  'Health':         '#14b8a6',
  'Utilities':      '#eab308',
  'Housing':        '#64748b',
  'Income':         '#10b981',
  'Savings':        '#6366f1',
  'Other':          '#6b7280',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  'Food & Dining':  '🍽️',
  'Groceries':      '🛒',
  'Shopping':       '🛍️',
  'Transport':      '🚗',
  'Entertainment':  '🎬',
  'Health':         '💊',
  'Utilities':      '💡',
  'Housing':        '🏠',
  'Income':         '💰',
  'Savings':        '🏦',
  'Other':          '📦',
};

export const ACCOUNT_ICONS: Record<AccountType, string> = {
  checking:   '🏦',
  savings:    '🐖',
  credit:     '💳',
  cash:       '💵',
  investment: '📈',
};

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  createdAt: string;
}

export interface Transaction {
  id?: number;
  accountId: number;
  amount: number;
  type: TransactionType;
  category: Category;
  merchant: string;
  date: string;
  note?: string;
  isRecurring: number; // SQLite uses 0/1
  imageUri?: string;
  items?: string;
  createdAt: string;
}

export interface Budget {
  id?: number;
  category: Category;
  amount: number;
  month: string; // YYYY-MM
}

export interface BudgetProgress extends Budget {
  spent: number;
  remaining: number;
  pct: number;
}

export interface CategorySummary {
  category: Category;
  total: number;
  count: number;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface ParsedReceipt {
  documentType: 'receipt' | 'check';
  merchant: string;
  date: string;
  total: number;
  currency: string;
  category: Category;
  items: Array<{ name: string; price: number }>;
  memo?: string;
}
