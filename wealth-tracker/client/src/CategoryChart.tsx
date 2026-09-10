import React from 'react';

interface Transaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface CategoryChartProps {
  transactions: Transaction[];
}

export default function CategoryChart({ transactions }: CategoryChartProps) {
  // Filter for expenses
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Group amounts by category
  const categoryTotals = expenseTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  // Sort categories highest to lowest
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="content-panel">
      <h3>Expense Breakdown by Category</h3>
      {sortedCategories.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No expense records available to render breakdown.</p>
      ) : (
        <div className="category-chart-container">
          {sortedCategories.map(([category, amount]) => {
            const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;

            return (
              <div key={category} className="chart-row">
                <div className="chart-label">
                  <span className="category-name">{category}</span>
                  <span className="category-amount">${amount.toLocaleString()} ({percentage}%)</span>
                </div>
                <div className="chart-bar-bg">
                  <div
                    className="chart-bar-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}