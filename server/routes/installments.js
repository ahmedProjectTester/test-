const express = require('express');
const moment = require('moment');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all installments with pagination and filters
router.get('/', authenticateToken, (req, res) => {
  const { page = 1, limit = 10, status = '', contract_id = '', customer_id = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (status) {
    whereClause += ' WHERE i.status = ?';
    params.push(status);
  }

  if (contract_id) {
    whereClause += status ? ' AND i.contract_id = ?' : ' WHERE i.contract_id = ?';
    params.push(contract_id);
  }

  if (customer_id) {
    whereClause += (status || contract_id) ? ' AND ct.customer_id = ?' : ' WHERE ct.customer_id = ?';
    params.push(customer_id);
  }

  // Count total installments
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    ${whereClause}
  `;
  
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get installments with contract and customer details
    const dataQuery = `
      SELECT 
        i.*,
        ct.contract_number,
        ct.total_amount as contract_total,
        c.name as customer_name,
        c.phone as customer_phone,
        SUM(p.amount) as total_payments
      FROM installments i
      JOIN contracts ct ON i.contract_id = ct.id
      JOIN customers c ON ct.customer_id = c.id
      LEFT JOIN payments p ON i.id = p.installment_id
      ${whereClause}
      GROUP BY i.id
      ORDER BY i.due_date DESC
      LIMIT ? OFFSET ?
    `;

    db.all(dataQuery, [...params, limit, offset], (err, installments) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        installments,
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

// Get installment by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      i.*,
      ct.contract_number,
      ct.total_amount as contract_total,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email,
      c.address as customer_address
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    WHERE i.id = ?
  `;

  db.get(query, [id], (err, installment) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!installment) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    res.json(installment);
  });
});

// Update installment status
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, paid_amount, paid_date, notes } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  let updateQuery = 'UPDATE installments SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  let params = [status, notes, id];

  if (status === 'paid' && paid_amount) {
    updateQuery = 'UPDATE installments SET status = ?, paid_amount = ?, paid_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params = [status, paid_amount, paid_date || new Date().toISOString().split('T')[0], notes, id];
  }

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    res.json({ message: 'Installment status updated successfully' });
  });
});

// Get overdue installments
router.get('/overdue/list', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      i.*,
      ct.contract_number,
      c.name as customer_name,
      c.phone as customer_phone,
      JULIANDAY('now') - JULIANDAY(i.due_date) as days_overdue
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    WHERE i.status = 'pending' AND DATE(i.due_date) < DATE('now')
    ORDER BY i.due_date ASC
  `;

  db.all(query, (err, installments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(installments);
  });
});

// Add late fee to installment
router.post('/:id/late-fee', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { late_fee } = req.body;

  if (!late_fee || late_fee <= 0) {
    return res.status(400).json({ error: 'Valid late fee amount is required' });
  }

  db.run(
    'UPDATE installments SET late_fee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [late_fee, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Installment not found' });
      }

      res.json({ message: 'Late fee added successfully' });
    }
  );
});

// Get installment payments
router.get('/:id/payments', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      p.*,
      u.full_name as created_by_name
    FROM payments p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.installment_id = ?
    ORDER BY p.payment_date DESC
  `;

  db.all(query, [id], (err, payments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(payments);
  });
});

// Reschedule installment
router.post('/:id/reschedule', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { new_due_date, notes } = req.body;

  if (!new_due_date) {
    return res.status(400).json({ error: 'New due date is required' });
  }

  db.run(
    'UPDATE installments SET due_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [new_due_date, notes, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Installment not found' });
      }

      res.json({ message: 'Installment rescheduled successfully' });
    }
  );
});

// Get upcoming installments (due in next 7 days)
router.get('/upcoming/list', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      i.*,
      ct.contract_number,
      c.name as customer_name,
      c.phone as customer_phone
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    WHERE i.status = 'pending' 
    AND DATE(i.due_date) BETWEEN DATE('now') AND DATE('now', '+7 days')
    ORDER BY i.due_date ASC
  `;

  db.all(query, (err, installments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(installments);
  });
});

module.exports = router;