const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const adminRoutes = require('./routes/admin');

// Register Routes
app.use('/api/admin', adminRoutes); // Mounts /api/admin/users, /api/admin/users/:id/role, etc.

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on https://react-a5f8.onrender.com`);
});