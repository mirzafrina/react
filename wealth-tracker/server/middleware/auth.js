const jwt = require('jsonwebtoken');

// 1. Verify token exists and is valid
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret');
    req.user = decoded; // Attach user payload ({ id, email, role }) to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// 2. Check if user is an Admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

// 3. Prevent Admin from self-deleting or demoting themselves
const preventSelfAction = (req, res, next) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user.id || req.user._id;

  if (targetUserId === currentUserId) {
    return res.status(400).json({ 
      error: 'Prohibited: You cannot change your own role or delete your account.' 
    });
  }
  next();
};

module.exports = { authenticate, requireAdmin, preventSelfAction };