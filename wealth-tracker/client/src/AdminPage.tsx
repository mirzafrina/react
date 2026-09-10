import React, { useState, useEffect, useCallback } from 'react';

interface UserData {
  id?: string;
  _id?: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

interface AdminPageProps {
  token: string;
  userEmail: string;
  onLogout: () => void;
}

const API_BASE = 'http://127.0.0.1:5000';

export default function AdminPage({ token, userEmail, onLogout }: AdminPageProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Theme state synced with localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    () => localStorage.getItem('theme') === 'dark'
  );

  // Sync theme class to body
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

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await res.json();
      setUsers(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error loading admin data');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update User Role
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setUpdatingId(userId);
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            (u.id || u._id) === userId ? { ...u, role: newRole } : u
          )
        );
      } else {
        alert('Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Server error updating role');
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => (u.id || u._id) !== userId));
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Admin Header */}
      <div className="dashboard-header">
        <div>
          <h2>Admin Control Center</h2>
          <p className="subtitle">
            Logged in as Admin: <strong>{userEmail}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Admin Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card balance">
          <h4>Total Registered Users</h4>
          <p>{users.length}</p>
        </div>
        <div className="stat-card income">
          <h4>Admin Accounts</h4>
          <p>{users.filter((u) => u.role === 'admin').length}</p>
        </div>
        <div className="stat-card expense">
          <h4>Standard Users</h4>
          <p>{users.filter((u) => u.role === 'user').length}</p>
        </div>
      </div>

      {/* User Management Table */}
      <div className="content-panel">
        <h3>User Directory & Access Control</h3>
        {error && <div className="error-msg">{error}</div>}
        {loading ? (
          <p className="empty-msg">Loading system users...</p>
        ) : users.length === 0 ? (
          <p className="empty-msg">No users registered in the system.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User Email</th>
                <th>Role Access</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const userId = u.id || u._id || u.email;
                const isSelf = u.email === userEmail;

                return (
                  <tr key={userId}>
                    <td style={{ fontWeight: 500 }}>
                      {u.email} {isSelf && <span style={{ opacity: 0.6 }}>(You)</span>}
                    </td>
                    <td>
                      <select
                        className={`role-select ${u.role}`}
                        value={u.role}
                        disabled={isSelf || updatingId === userId}
                        onChange={(e) =>
                          handleRoleChange(userId, e.target.value as 'admin' | 'user')
                        }
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      {!isSelf && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteUser(userId)}
                        >
                          Delete User
                        </button>
                      )}
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