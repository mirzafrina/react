import Database from 'better-sqlite3';
import path from 'path';
// Creates or opens finance.db file in server folder
const db = new Database(path.join(process.cwd(), 'finance.db'));
// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
// Initial Table Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
export default db;
