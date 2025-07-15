const express = require('express');
const moment = require('moment');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all contracts with pagination and search
router.get('/', authenticateToken, (req, res) => {
  const { page = 1, limit = 10, search = '', status = '', customer_id = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (search) {
    whereClause += ' WHERE (ct.contract_number LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClause += search ? ' AND ct.status = ?' : ' WHERE ct.status = ?';
    params.push(status);
  }

  if (customer_id) {
    whereClause += (search || status) ? ' AND ct.customer_id = ?' : ' WHERE ct.customer_id = ?';
    params.push(customer_id);
  }

  // Count total contracts
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM contracts ct
    JOIN customers c ON ct.customer_id = c.id
    ${whereClause}
  `;
  
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get contracts with customer details
    const dataQuery = `
      SELECT 
        ct.*,
        c.name as customer_name,
        c.phone as customer_phone,
        u.full_name as employee_name,
        COUNT(i.id) as total_installments,
        SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
        SUM(CASE WHEN i.status = 'pending' AND DATE(i.due_date) < DATE('now') THEN 1 ELSE 0 END) as overdue_installments,
        SUM(i.paid_amount) as total_paid
      FROM contracts ct
      JOIN customers c ON ct.customer_id = c.id
      LEFT JOIN users u ON ct.responsible_employee = u.id
      LEFT JOIN installments i ON ct.id = i.contract_id
      ${whereClause}
      GROUP BY ct.id
      ORDER BY ct.created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.all(dataQuery, [...params, limit, offset], (err, contracts) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        contracts,
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

// Get contract by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      ct.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email,
      c.address as customer_address,
      u.full_name as employee_name
    FROM contracts ct
    JOIN customers c ON ct.customer_id = c.id
    LEFT JOIN users u ON ct.responsible_employee = u.id
    WHERE ct.id = ?
  `;

  db.get(query, [id], (err, contract) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  });
});

// Create new contract
router.post('/', authenticateToken, (req, res) => {
  const { 
    customer_id, 
    total_amount, 
    number_of_installments, 
    start_date, 
    interest_rate = 0,
    description,
    responsible_employee
  } = req.body;

  if (!customer_id || !total_amount || !number_of_installments || !start_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Calculate installment amount
  const installment_amount = (total_amount + (total_amount * interest_rate / 100)) / number_of_installments;
  
  // Calculate end date
  const end_date = moment(start_date).add(number_of_installments, 'months').format('YYYY-MM-DD');
  
  // Generate contract number
  const contract_number = `CT-${Date.now()}`;

  db.run(
    `INSERT INTO contracts (
      customer_id, contract_number, total_amount, installment_amount, 
      number_of_installments, start_date, end_date, interest_rate, 
      description, responsible_employee, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer_id, contract_number, total_amount, installment_amount,
      number_of_installments, start_date, end_date, interest_rate,
      description, responsible_employee, req.user.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const contract_id = this.lastID;

      // Create installments
      const installments = [];
      for (let i = 1; i <= number_of_installments; i++) {
        const due_date = moment(start_date).add(i, 'months').format('YYYY-MM-DD');
        installments.push([contract_id, i, installment_amount, due_date]);
      }

      // Insert installments
      const installmentQuery = `
        INSERT INTO installments (contract_id, installment_number, amount, due_date)
        VALUES (?, ?, ?, ?)
      `;

      const insertPromises = installments.map(installment => {
        return new Promise((resolve, reject) => {
          db.run(installmentQuery, installment, function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });
      });

      Promise.all(insertPromises)
        .then(() => {
          res.status(201).json({
            message: 'Contract created successfully',
            contract: {
              id: contract_id,
              contract_number,
              customer_id,
              total_amount,
              installment_amount,
              number_of_installments
            }
          });
        })
        .catch(err => {
          res.status(500).json({ error: 'Error creating installments' });
        });
    }
  );
});

// Update contract
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { 
    total_amount, 
    number_of_installments, 
    start_date, 
    interest_rate,
    description,
    responsible_employee,
    status
  } = req.body;

  if (!total_amount || !number_of_installments || !start_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Calculate installment amount
  const installment_amount = (total_amount + (total_amount * interest_rate / 100)) / number_of_installments;
  
  // Calculate end date
  const end_date = moment(start_date).add(number_of_installments, 'months').format('YYYY-MM-DD');

  db.run(
    `UPDATE contracts 
     SET total_amount = ?, installment_amount = ?, number_of_installments = ?, 
         start_date = ?, end_date = ?, interest_rate = ?, description = ?, 
         responsible_employee = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      total_amount, installment_amount, number_of_installments,
      start_date, end_date, interest_rate, description,
      responsible_employee, status, id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      res.json({ message: 'Contract updated successfully' });
    }
  );
});

// Delete contract
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Check if contract has payments
  db.get(
    'SELECT COUNT(*) as count FROM payments p JOIN installments i ON p.installment_id = i.id WHERE i.contract_id = ?',
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.count > 0) {
        return res.status(400).json({ error: 'Cannot delete contract with existing payments' });
      }

      // Delete installments first
      db.run('DELETE FROM installments WHERE contract_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Delete contract
        db.run('DELETE FROM contracts WHERE id = ?', [id], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'Contract not found' });
          }

          res.json({ message: 'Contract deleted successfully' });
        });
      });
    }
  );
});

// Get contract installments
router.get('/:id/installments', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      i.*,
      SUM(p.amount) as total_payments
    FROM installments i
    LEFT JOIN payments p ON i.id = p.installment_id
    WHERE i.contract_id = ?
    GROUP BY i.id
    ORDER BY i.installment_number
  `;

  db.all(query, [id], (err, installments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(installments);
  });
});

module.exports = router;