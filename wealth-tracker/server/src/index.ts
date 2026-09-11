import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();

// Use Render's dynamic PORT or default to 5000 locally
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-wealth-tracker';

// CORS Middleware Configuration
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Models
interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
}

interface Transaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

// In-Memory Database Arrays
const users: User[] = [];
const transactions: Transaction[] = [];

// Seed Initial Admin Account
const seedAdmin = async () => {
  const adminEmail = 'admin@wealth.com';
  if (!users.some((u) => u.email === adminEmail)) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    users.push({
      id: 'admin-id-1',
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });
    console.log('👑 Admin user initialized: admin@wealth.com / admin123');
  }
};
seedAdmin();

interface AuthRequest extends Request {
  userId?: string;
  userRole?: 'admin' | 'user';
}

// Token Verification Middleware
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  });
};

// Admin Guard Middleware
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Prevent Self-Action Middleware
const preventSelfAction = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'Admins cannot modify or delete their own admin account' });
  }
  next();
};

// ---------------- AUTH ENDPOINTS ----------------

// Register User
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Valid email and password (min 6 chars) required' });
  }

  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: Date.now().toString(),
    email,
    passwordHash,
    role: 'user',
  };
  users.push(newUser);

  const token = jwt.sign(
    { userId: newUser.id, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
});

// Login User
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// ---------------- TRANSACTIONS ENDPOINTS ----------------

// Get User Transactions
app.get('/api/transactions', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.userRole === 'admin') {
    return res.json(transactions);
  }
  const userTxs = transactions.filter((t) => t.userId === req.userId);
  res.json(userTxs);
});

// Add Transaction
app.post('/api/transactions', authenticateToken, (req: AuthRequest, res: Response) => {
  const { title, amount, type, category, date } = req.body;

  if (!title || !amount || !type || !category) {
    return res.status(400).json({ error: 'Title, amount, type, and category are required' });
  }

  const newTx: Transaction = {
    id: Date.now().toString(),
    userId: req.userId!,
    title: title.trim(),
    amount: Number(amount),
    type,
    category,
    date: date || new Date().toISOString().split('T')[0],
  };

  transactions.push(newTx);
  res.status(201).json(newTx);
});

// Get Summary
app.get('/api/summary', authenticateToken, (req: AuthRequest, res: Response) => {
  const targetTxs = req.userRole === 'admin'
    ? transactions
    : transactions.filter((t) => t.userId === req.userId);

  const totalIncome = targetTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = targetTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  res.json({
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
  });
});

// ---------------- ADMIN ENDPOINTS ----------------

// Get All Users
app.get('/api/admin/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const safeUsers = users.map((u) => {
    const userTxs = transactions.filter((t) => t.userId === u.id);

    const totalIncome = userTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = userTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      id: u.id,
      email: u.email,
      role: u.role,
      totalIncome,
      totalExpense,
    };
  });

  res.json(safeUsers);
});

// Update User Password
app.put('/api/admin/users/:id/password', authenticateToken, requireAdmin, preventSelfAction, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  const user = users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!password || password.trim() === '') {
    return res.status(400).json({ error: 'Password cannot be empty' });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  res.json({ message: 'Password updated successfully' });
});

// Delete User
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, preventSelfAction, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) return res.status(404).json({ error: 'User not found' });

  users.splice(index, 1);

  for (let i = transactions.length - 1; i >= 0; i--) {
    if (transactions[i].userId === id) {
      transactions.splice(i, 1);
    }
  }

  res.json({ success: true });
});

// Bind to 0.0.0.0 for Render host binding compatibility
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});