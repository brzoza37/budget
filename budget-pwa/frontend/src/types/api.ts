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

export interface PlannedPayment {
  '@id'?: string;
  id?: number;
  name: string;
  amount: number;
  category?: Category;
  account?: Account;
  dueDate: string;
  isPaid: boolean;
  note?: string;
}

export interface StatsSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  plannedExpensesUnpaid: number;
  forecastedBalance: number;
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
}
