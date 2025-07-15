const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all customers with pagination and search
router.get('/', authenticateToken, (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (search) {
    whereClause += ' WHERE (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClause += search ? ' AND status = ?' : ' WHERE status = ?';
    params.push(status);
  }

  // Count total customers
  const countQuery = `SELECT COUNT(*) as total FROM customers${whereClause}`;
  
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get customers with pagination
    const dataQuery = `
      SELECT 
        c.*,
        COUNT(ct.id) as total_contracts,
        SUM(CASE WHEN ct.status = 'active' THEN 1 ELSE 0 END) as active_contracts,
        SUM(CASE WHEN i.status = 'pending' AND DATE(i.due_date) < DATE('now') THEN 1 ELSE 0 END) as overdue_installments
      FROM customers c
      LEFT JOIN contracts ct ON c.id = ct.customer_id
      LEFT JOIN installments i ON ct.id = i.contract_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.all(dataQuery, [...params, limit, offset], (err, customers) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        customers,
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

// Get customer by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      c.*,
      COUNT(ct.id) as total_contracts,
      SUM(CASE WHEN ct.status = 'active' THEN 1 ELSE 0 END) as active_contracts,
      SUM(CASE WHEN i.status = 'pending' AND DATE(i.due_date) < DATE('now') THEN 1 ELSE 0 END) as overdue_installments
    FROM customers c
    LEFT JOIN contracts ct ON c.id = ct.customer_id
    LEFT JOIN installments i ON ct.id = i.contract_id
    WHERE c.id = ?
    GROUP BY c.id
  `;

  db.get(query, [id], (err, customer) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  });
});

// Create new customer
router.post('/', authenticateToken, (req, res) => {
  const { name, phone, email, address, national_id, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  db.run(
    `INSERT INTO customers (name, phone, email, address, national_id, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, email, address, national_id, notes, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({
        message: 'Customer created successfully',
        customer: {
          id: this.lastID,
          name,
          phone,
          email,
          address,
          national_id,
          notes
        }
      });
    }
  );
});

// Update customer
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, national_id, status, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  db.run(
    `UPDATE customers 
     SET name = ?, phone = ?, email = ?, address = ?, national_id = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, phone, email, address, national_id, status, notes, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({ message: 'Customer updated successfully' });
    }
  );
});

// Delete customer
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Check if customer has contracts
  db.get('SELECT COUNT(*) as count FROM contracts WHERE customer_id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete customer with existing contracts' });
    }

    db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({ message: 'Customer deleted successfully' });
    });
  });
});

// Get customer contracts
router.get('/:id/contracts', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      ct.*,
      COUNT(i.id) as total_installments,
      SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
      SUM(CASE WHEN i.status = 'pending' AND DATE(i.due_date) < DATE('now') THEN 1 ELSE 0 END) as overdue_installments
    FROM contracts ct
    LEFT JOIN installments i ON ct.id = i.contract_id
    WHERE ct.customer_id = ?
    GROUP BY ct.id
    ORDER BY ct.created_at DESC
  `;

  db.all(query, [id], (err, contracts) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(contracts);
  });
});

module.exports = router;