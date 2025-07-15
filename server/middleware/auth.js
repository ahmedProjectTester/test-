const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Get user details from database
    db.get(
      'SELECT id, username, email, role, full_name FROM users WHERE id = ?',
      [user.userId],
      (err, userRow) => {
        if (err || !userRow) {
          return res.status(403).json({ error: 'User not found' });
        }
        
        req.user = userRow;
        next();
      }
    );
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};