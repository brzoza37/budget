export interface Account {
  '@id'?: string;
  id?: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  '@id'?: string;
  id?: number;
  name: string;
  icon: string;
  color: string;
  type: 'INCOME' | 'EXPENSE';
  isArchived?: boolean;
}

export interface Transaction {
  '@id'?: string;
  id?: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  account: Account;
  category?: Category;
  toAccount?: Account;
  note?: string;
  date: string;
  plannedItem?: { id: number };
  createdAt?: string;
}

export interface Budget {
  '@id'?: string;
  id?: number;
  category: Category;
  amount: number;
  month: number;
  year: number;
  spent?: number;
}

export interface RecurringEvent {
  '@id'?: string;
  id?: number;
  name: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category?: Category;
  account?: Account;
  repeatEvery: number;
  repeatUnit: 'days' | 'weeks' | 'months' | 'years';
  dayOfMonth?: number | null;
  startDate: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlannedItem {
  '@id'?: string;
  id?: number;
  name: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category?: Category;
  account?: Account;
  dueDate: string;
  isPaid: boolean;
  paidAmount?: number | null;
  paidAt?: string | null;
  paidTransaction?: { id: number } | null;
  recurringEvent?: RecurringEvent | null;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConfirmPayload {
  amount: number;
  accountId: number;
  date: string;
}

export interface StatsSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  plannedIncomeThisMonth: number;
  plannedExpensesThisMonth: number;
  forecastedBalance: number;
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
}

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  currency: string;
}
