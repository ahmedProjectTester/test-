const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          full_name: user.full_name
        }
      });
    }
  );
});

// Register (admin only)
router.post('/register', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { username, email, password, role, full_name, phone } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (username, email, password, role, full_name, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, role || 'employee', full_name, phone],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        res.status(201).json({
          message: 'User created successfully',
          user: {
            id: this.lastID,
            username,
            email,
            role: role || 'employee',
            full_name
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireRole(['admin']), (req, res) => {
  db.all(
    'SELECT id, username, email, role, full_name, phone, created_at FROM users ORDER BY created_at DESC',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(users);
    }
  );
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { username, email, role, full_name, phone, password } = req.body;

  let updateQuery = `UPDATE users SET username = ?, email = ?, role = ?, full_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  let params = [username, email, role, full_name, phone, id];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateQuery = `UPDATE users SET username = ?, email = ?, role = ?, full_name = ?, phone = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    params = [username, email, role, full_name, phone, hashedPassword, id];
  }

  db.run(updateQuery, params, function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  });
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;