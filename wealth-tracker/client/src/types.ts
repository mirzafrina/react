export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
};

export type FinancialSummary = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
};