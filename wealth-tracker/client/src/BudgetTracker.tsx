import React, { useState, useEffect } from 'react';
import CategoryChart from './CategoryChart';

interface Transaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
}

interface UserSummary {
  id: string;
  email: string;
  password?: string;
  totalIncome: number;
  totalExpense: number;
}

interface BudgetTrackerProps {
  token: string;
  user: { id: string; email: string; role: 'admin' | 'user' };
  onLogout: () => void;
}

const API_BASE = 'http://127.0.0.1:5000';

export default function BudgetTracker({ token, user, onLogout }: BudgetTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpense: 0, totalBalance: 0 });
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchData = async () => {
    try {
      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/api/transactions`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/summary`, { headers: authHeaders }),
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());

      if (user.role === 'admin') {
        const usersRes = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders });
        if (usersRes.ok) setUserSummaries(await usersRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch budget data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title, amount: Number(amount), type, category, date }),
      });

      if (res.ok) {
        setTitle('');
        setAmount('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create transaction:', err);
    }
  };

  const handleUpdatePassword = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setEditingUserId(null);
        setNewPassword('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update password:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user and all their records?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (res.ok) fetchData();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2>Wealth Tracker Dashboard</h2>
          <p>Logged in as: <strong>{user.email}</strong> ({user.role})</p>
        </div>
        <button onClick={onLogout} className="btn-logout">Logout</button>
      </header>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card balance">
          <h4>Total Balance</h4>
          <p>${summary.totalBalance.toLocaleString()}</p>
        </div>
        <div className="summary-card income">
          <h4>Total Income</h4>
          <p>+${summary.totalIncome.toLocaleString()}</p>
        </div>
        <div className="summary-card expense">
          <h4>Total Expense</h4>
          <p>-${summary.totalExpense.toLocaleString()}</p>
        </div>
      </div>

      {/* New Transaction Form */}
      <div className="content-panel">
        <h3>Add New Transaction</h3>
        <form onSubmit={handleAddTransaction} className="transaction-form">
          <input
            type="text"
            placeholder="Title (e.g. Groceries)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            type="text"
            placeholder="Category (e.g. Food, Salary)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">Add Transaction</button>
        </form>
      </div>

      {/* Category Chart Breakdown */}
      <CategoryChart transactions={transactions} />

      {/* Admin Panel (Visible only to Admin role) */}
      {user.role === 'admin' && (
        <div className="content-panel admin-panel">
          <h3>Admin Control Center - User Overview</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Email</th>
                <th>Password</th>
                <th>Total Income</th>
                <th>Total Expense</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userSummaries.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    {editingUserId === u.id ? (
                      <input
                        type="text"
                        placeholder="New Password (or blank to clear)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    ) : (
                      <code>{u.password || '[DELETED]'}</code>
                    )}
                  </td>
                  <td style={{ color: '#10b981' }}>+${u.totalIncome.toLocaleString()}</td>
                  <td style={{ color: '#ef4444' }}>-${u.totalExpense.toLocaleString()}</td>
                  <td>
                    {editingUserId === u.id ? (
                      <>
                        <button onClick={() => handleUpdatePassword(u.id)} className="btn-sm btn-save">Save</button>
                        <button onClick={() => setEditingUserId(null)} className="btn-sm btn-cancel">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingUserId(u.id)} className="btn-sm btn-edit">Edit Pass</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="btn-sm btn-delete">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}