const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all alerts with pagination and filters
router.get('/', authenticateToken, (req, res) => {
  const { page = 1, limit = 10, type = '', priority = '', is_read = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (type) {
    whereClause += ' WHERE type = ?';
    params.push(type);
  }

  if (priority) {
    whereClause += type ? ' AND priority = ?' : ' WHERE priority = ?';
    params.push(priority);
  }

  if (is_read !== '') {
    whereClause += (type || priority) ? ' AND is_read = ?' : ' WHERE is_read = ?';
    params.push(is_read === 'true');
  }

  // Count total alerts
  const countQuery = `SELECT COUNT(*) as total FROM alerts${whereClause}`;
  
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get alerts with related data
    const dataQuery = `
      SELECT 
        a.*,
        c.name as customer_name,
        ct.contract_number,
        u.full_name as created_by_name
      FROM alerts a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN contracts ct ON a.contract_id = ct.id
      LEFT JOIN users u ON a.created_by = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.all(dataQuery, [...params, limit, offset], (err, alerts) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        alerts,
        pagination: {
          total: countResult.total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get alert by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      a.*,
      c.name as customer_name,
      c.phone as customer_phone,
      ct.contract_number,
      i.installment_number,
      u.full_name as created_by_name
    FROM alerts a
    LEFT JOIN customers c ON a.customer_id = c.id
    LEFT JOIN contracts ct ON a.contract_id = ct.id
    LEFT JOIN installments i ON a.installment_id = i.id
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.id = ?
  `;

  db.get(query, [id], (err, alert) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  });
});

// Create new alert
router.post('/', authenticateToken, (req, res) => {
  const { title, message, type, priority, customer_id, contract_id, installment_id } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  db.run(
    `INSERT INTO alerts (title, message, type, priority, customer_id, contract_id, installment_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, message, type || 'info', priority || 'medium', customer_id, contract_id, installment_id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({
        message: 'Alert created successfully',
        alert: {
          id: this.lastID,
          title,
          message,
          type: type || 'info',
          priority: priority || 'medium'
        }
      });
    }
  );
});

// Update alert
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, message, type, priority, is_read } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  db.run(
    'UPDATE alerts SET title = ?, message = ?, type = ?, priority = ?, is_read = ? WHERE id = ?',
    [title, message, type, priority, is_read, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ message: 'Alert updated successfully' });
    }
  );
});

// Mark alert as read
router.put('/:id/read', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE alerts SET is_read = TRUE WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ message: 'Alert marked as read' });
    }
  );
});

// Mark all alerts as read
router.put('/read/all', authenticateToken, (req, res) => {
  db.run(
    'UPDATE alerts SET is_read = TRUE WHERE is_read = FALSE',
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ message: `${this.changes} alerts marked as read` });
    }
  );
});

// Delete alert
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM alerts WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted successfully' });
  });
});

// Get today's alerts
router.get('/daily/today', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      a.*,
      c.name as customer_name,
      ct.contract_number
    FROM alerts a
    LEFT JOIN customers c ON a.customer_id = c.id
    LEFT JOIN contracts ct ON a.contract_id = ct.id
    WHERE DATE(a.created_at) = DATE('now')
    ORDER BY a.priority DESC, a.created_at DESC
  `;

  db.all(query, (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(alerts);
  });
});

// Get unread alerts count
router.get('/unread/count', authenticateToken, (req, res) => {
  const query = 'SELECT COUNT(*) as count FROM alerts WHERE is_read = FALSE';

  db.get(query, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ count: result.count });
  });
});

// Auto-generate alerts for overdue installments
router.post('/generate/overdue', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      i.id as installment_id,
      i.installment_number,
      i.amount,
      i.due_date,
      ct.id as contract_id,
      ct.contract_number,
      ct.customer_id,
      c.name as customer_name,
      JULIANDAY('now') - JULIANDAY(i.due_date) as days_overdue
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    WHERE i.status = 'pending' 
    AND DATE(i.due_date) < DATE('now')
    AND NOT EXISTS (
      SELECT 1 FROM alerts a 
      WHERE a.installment_id = i.id 
      AND a.type = 'overdue'
      AND DATE(a.created_at) = DATE('now')
    )
  `;

  db.all(query, (err, overdueInstallments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (overdueInstallments.length === 0) {
      return res.json({ message: 'No new overdue installments found' });
    }

    const alertPromises = overdueInstallments.map(installment => {
      return new Promise((resolve, reject) => {
        const title = `Overdue Installment - ${installment.customer_name}`;
        const message = `Contract ${installment.contract_number}, Installment #${installment.installment_number} is ${Math.floor(installment.days_overdue)} days overdue. Amount: $${installment.amount}`;
        
        db.run(
          `INSERT INTO alerts (title, message, type, priority, customer_id, contract_id, installment_id, created_by)
           VALUES (?, ?, 'overdue', 'high', ?, ?, ?, ?)`,
          [title, message, installment.customer_id, installment.contract_id, installment.installment_id, req.user.id],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    });

    Promise.all(alertPromises)
      .then((alertIds) => {
        res.json({ 
          message: `${alertIds.length} overdue alerts generated successfully`,
          alertIds 
        });
      })
      .catch(err => {
        res.status(500).json({ error: 'Error generating alerts' });
      });
  });
});

// Auto-generate alerts for upcoming due dates
router.post('/generate/upcoming', authenticateToken, (req, res) => {
  const { days_ahead = 3 } = req.body;

  const query = `
    SELECT 
      i.id as installment_id,
      i.installment_number,
      i.amount,
      i.due_date,
      ct.id as contract_id,
      ct.contract_number,
      ct.customer_id,
      c.name as customer_name
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    WHERE i.status = 'pending' 
    AND DATE(i.due_date) = DATE('now', '+${days_ahead} days')
    AND NOT EXISTS (
      SELECT 1 FROM alerts a 
      WHERE a.installment_id = i.id 
      AND a.type = 'upcoming'
      AND DATE(a.created_at) = DATE('now')
    )
  `;

  db.all(query, (err, upcomingInstallments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (upcomingInstallments.length === 0) {
      return res.json({ message: 'No upcoming installments found' });
    }

    const alertPromises = upcomingInstallments.map(installment => {
      return new Promise((resolve, reject) => {
        const title = `Upcoming Payment - ${installment.customer_name}`;
        const message = `Contract ${installment.contract_number}, Installment #${installment.installment_number} is due in ${days_ahead} days. Amount: $${installment.amount}`;
        
        db.run(
          `INSERT INTO alerts (title, message, type, priority, customer_id, contract_id, installment_id, created_by)
           VALUES (?, ?, 'upcoming', 'medium', ?, ?, ?, ?)`,
          [title, message, installment.customer_id, installment.contract_id, installment.installment_id, req.user.id],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    });

    Promise.all(alertPromises)
      .then((alertIds) => {
        res.json({ 
          message: `${alertIds.length} upcoming payment alerts generated successfully`,
          alertIds 
        });
      })
      .catch(err => {
        res.status(500).json({ error: 'Error generating alerts' });
      });
  });
});

module.exports = router;