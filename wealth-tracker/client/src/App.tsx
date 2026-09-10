import React, { useState, useEffect, useCallback } from 'react';
import AdminPage from './AdminPage';
import './App.css';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

interface Transaction {
  id?: string;
  _id?: string;
  userId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

const API_BASE = 'http://127.0.0.1:5000';

const CATEGORY_COLORS: Record<string, string> = {
  Salary: '#10b981',
  Freelance: '#3b82f6',
  Food: '#f59e0b',
  Utilities: '#ef4444',
  Entertainment: '#8b5cf6',
  Other: '#6b7280',
};

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    () => localStorage.getItem('theme') === 'dark'
  );

  // Form toggles & Auth inputs
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Dashboard state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<string>('Food');

  // Sync Theme with Body Class
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Load user transactions safely
  const fetchTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token && user?.role !== 'admin') {
      fetchTransactions();
    }
  }, [token, user?.role, fetchTransactions]);

  // Handle Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setEmailInput('');
      setPasswordInput('');
    } catch (err) {
      setAuthError('Server error. Is the backend running?');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setTransactions([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Add Income or Expense
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          amount: parsedAmount,
          type,
          category,
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (res.ok) {
        setTitle('');
        setAmount('');
        fetchTransactions();
      }
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => (t.id || t._id) !== id));
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  // 1. Unauthenticated View
  if (!token || !user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>{isLoginView ? 'Welcome Back' : 'Create Account'}</h2>
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
          {authError && <div className="error-msg">{authError}</div>}

          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="user@wealth.com"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary">
              {isLoginView ? 'Sign In' : 'Register'}
            </button>
          </form>

          <div className="toggle-auth">
            {isLoginView ? "Don't have an account? " : 'Already registered? '}
            <button onClick={() => setIsLoginView(!isLoginView)}>
              {isLoginView ? 'Register' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Admin Portal View
  if (user.role === 'admin') {
    return <AdminPage token={token} onLogout={handleLogout} userEmail={user.email} />;
  }

  // 3. Financial Computations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  const expenseByCategory = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  let cumulativePercent = 0;
  const gradientSlices = Object.entries(expenseByCategory).map(([cat, amt]) => {
    const percent = (amt / totalExpense) * 100;
    const start = cumulativePercent;
    cumulativePercent += percent;
    const color = CATEGORY_COLORS[cat] || '#6b7280';
    return `${color} ${start}% ${cumulativePercent}%`;
  });

  const pieGradientCss =
    gradientSlices.length > 0
      ? `conic-gradient(${gradientSlices.join(', ')})`
      : 'conic-gradient(#e5e7eb 0% 100%)';

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <h2>Wealth Tracker</h2>
          <p className="subtitle">
            Logged in as: <strong>{user.email}</strong>
            <span className={`role-badge ${user.role}`} style={{ marginLeft: '8px' }}>
              {user.role}
            </span>
          </p>
          {user.createdAt && (
            <p className="joined-date" style={{ fontSize: '12px', opacity: 0.7 }}>
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="stats-grid">
        <div className="stat-card income">
          <h4>Total Income</h4>
          <p>${totalIncome.toLocaleString()}</p>
        </div>
        <div className="stat-card expense">
          <h4>Total Expenses</h4>
          <p>${totalExpense.toLocaleString()}</p>
        </div>
        <div className="stat-card balance">
          <h4>Net Balance</h4>
          <p>${totalBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Input Form & Expense Chart */}
      <div className="dashboard-main-grid">
        <div className="content-panel">
          <h3>Add Transaction</h3>
          <form onSubmit={handleAddTransaction} className="form-vertical">
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                placeholder="e.g. Groceries"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Food">Food</option>
                <option value="Utilities">Utilities</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Salary">Salary</option>
                <option value="Freelance">Freelance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Add Transaction
            </button>
          </form>
        </div>

        {/* Expenses Pie Chart Panel */}
        <div className="content-panel">
          <h3>Expense Distribution</h3>
          {totalExpense === 0 ? (
            <p className="empty-msg">No expenses recorded to build pie chart.</p>
          ) : (
            <div className="chart-wrapper">
              <div
                className="pie-chart"
                style={{ background: pieGradientCss }}
              />
              <div className="chart-legend">
                {Object.entries(expenseByCategory).map(([cat, amt]) => (
                  <div key={cat} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }}
                    />
                    <span className="legend-label">{cat}</span>
                    <span className="legend-value">${amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="content-panel" style={{ marginTop: '20px' }}>
        <h3>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p className="empty-msg">No records yet. Add your first transaction above!</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const txId = t.id || t._id || '';
                return (
                  <tr key={txId}>
                    <td>{t.date}</td>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td>{t.category}</td>
                    <td>
                      <span className={`type-badge ${t.type}`}>{t.type}</span>
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: t.type === 'income' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteTransaction(txId)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}