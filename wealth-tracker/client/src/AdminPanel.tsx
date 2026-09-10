import React, { useState, useEffect } from 'react';

interface UserRecord {
  id: string;
  email: string;
  password: string;
  totalIncome: number;
  totalExpense: number;
}

interface AdminPanelProps {
  token: string;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPasswordInput, setEditPasswordInput] = useState<string>('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch user credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleSavePassword = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: editPasswordInput }),
      });

      if (res.ok) {
        setEditingUserId(null);
        setEditPasswordInput('');
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to update password:', err);
    }
  };

  const handleDeletePassword = async (userId: string) => {
    if (!confirm('Clear this user password?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: '' }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Failed to delete password:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete user and all associated records?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  if (loading) return <p>Loading Admin Panel...</p>;

  return (
    <div className="card" style={{ width: '100%' }}>
      <h3>User Credentials & Financial Summaries</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ padding: '8px' }}>Email</th>
            <th style={{ padding: '8px' }}>Password</th>
            <th style={{ padding: '8px' }}>Total Income</th>
            <th style={{ padding: '8px' }}>Total Expenses</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isEditing = editingUserId === u.id;
            return (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{u.email}</td>
                <td style={{ padding: '8px' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="text"
                        value={editPasswordInput}
                        onChange={(e) => setEditPasswordInput(e.target.value)}
                        style={{ width: '100px' }}
                      />
                      <button onClick={() => handleSavePassword(u.id)}>Save</button>
                      <button onClick={() => setEditingUserId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <code>{u.password}</code>
                  )}
                </td>
                <td style={{ padding: '8px', color: '#10b981' }}>${u.totalIncome}</td>
                <td style={{ padding: '8px', color: '#ef4444' }}>${u.totalExpense}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  <button onClick={() => { setEditingUserId(u.id); setEditPasswordInput(u.password); }} style={{ marginRight: '4px' }}>Edit</button>
                  <button onClick={() => handleDeletePassword(u.id)} style={{ marginRight: '4px', background: '#f59e0b', color: '#fff' }}>Del Pass</button>
                  <button onClick={() => handleDeleteUser(u.id)} style={{ background: '#ef4444', color: '#fff' }}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}