const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, preventSelfAction } = require('../middleware/auth');

// Replace this with your actual database model (e.g., Mongoose User model)
const User = require('../models/User'); 

// Apply authentication & admin checks to ALL routes in this file
router.use(authenticate, requireAdmin);

// 1. GET /api/admin/users - Fetch all users
router.get('/users', async (req, res) => {
  try {
    // Exclude password hashes when returning user list
    const users = await User.find({}, '-password'); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 2. PATCH /api/admin/users/:id/role - Update user role
router.patch('/users/:id/role', preventSelfAction, async (req, res) => {
  const { role } = req.body;

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Database update failed' });
  }
});

// 3. DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', preventSelfAction, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;