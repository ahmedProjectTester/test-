const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all payments with pagination and filters
router.get('/', authenticateToken, (req, res) => {
  const { page = 1, limit = 10, customer_id = '', contract_id = '', payment_method = '', date_from = '', date_to = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (customer_id) {
    whereClause += ' WHERE ct.customer_id = ?';
    params.push(customer_id);
  }

  if (contract_id) {
    whereClause += customer_id ? ' AND i.contract_id = ?' : ' WHERE i.contract_id = ?';
    params.push(contract_id);
  }

  if (payment_method) {
    whereClause += (customer_id || contract_id) ? ' AND p.payment_method = ?' : ' WHERE p.payment_method = ?';
    params.push(payment_method);
  }

  if (date_from) {
    whereClause += (customer_id || contract_id || payment_method) ? ' AND DATE(p.payment_date) >= ?' : ' WHERE DATE(p.payment_date) >= ?';
    params.push(date_from);
  }

  if (date_to) {
    whereClause += (customer_id || contract_id || payment_method || date_from) ? ' AND DATE(p.payment_date) <= ?' : ' WHERE DATE(p.payment_date) <= ?';
    params.push(date_to);
  }

  // Count total payments
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM payments p
    JOIN installments i ON p.installment_id = i.id
    JOIN contracts ct ON i.contract_id = ct.id
    ${whereClause}
  `;
  
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get payments with details
    const dataQuery = `
      SELECT 
        p.*,
        i.installment_number,
        i.amount as installment_amount,
        ct.contract_number,
        c.name as customer_name,
        c.phone as customer_phone,
        u.full_name as created_by_name
      FROM payments p
      JOIN installments i ON p.installment_id = i.id
      JOIN contracts ct ON i.contract_id = ct.id
      JOIN customers c ON ct.customer_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.payment_date DESC
      LIMIT ? OFFSET ?
    `;

    db.all(dataQuery, [...params, limit, offset], (err, payments) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        payments,
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

// Get payment by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      p.*,
      i.installment_number,
      i.amount as installment_amount,
      i.due_date as installment_due_date,
      ct.contract_number,
      ct.total_amount as contract_total,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email,
      c.address as customer_address,
      u.full_name as created_by_name
    FROM payments p
    JOIN installments i ON p.installment_id = i.id
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `;

  db.get(query, [id], (err, payment) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  });
});

// Create new payment
router.post('/', authenticateToken, (req, res) => {
  const { installment_id, amount, payment_date, payment_method, reference_number, notes } = req.body;

  if (!installment_id || !amount || !payment_date || !payment_method) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if installment exists
  db.get('SELECT * FROM installments WHERE id = ?', [installment_id], (err, installment) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!installment) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    // Insert payment
    db.run(
      `INSERT INTO payments (installment_id, amount, payment_date, payment_method, reference_number, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [installment_id, amount, payment_date, payment_method, reference_number, notes, req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Update installment paid amount and status
        const newPaidAmount = (installment.paid_amount || 0) + parseFloat(amount);
        const newStatus = newPaidAmount >= installment.amount ? 'paid' : 'partial';

        db.run(
          'UPDATE installments SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newPaidAmount, newStatus, installment_id],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error updating installment' });
            }

            res.status(201).json({
              message: 'Payment created successfully',
              payment: {
                id: this.lastID,
                installment_id,
                amount,
                payment_date,
                payment_method,
                reference_number
              }
            });
          }
        );
      }
    );
  });
});

// Update payment
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { amount, payment_date, payment_method, reference_number, notes } = req.body;

  if (!amount || !payment_date || !payment_method) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get old payment details
  db.get('SELECT * FROM payments WHERE id = ?', [id], (err, oldPayment) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!oldPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment
    db.run(
      'UPDATE payments SET amount = ?, payment_date = ?, payment_method = ?, reference_number = ?, notes = ? WHERE id = ?',
      [amount, payment_date, payment_method, reference_number, notes, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Recalculate installment paid amount
        db.get(
          'SELECT SUM(amount) as total_paid FROM payments WHERE installment_id = ?',
          [oldPayment.installment_id],
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            const totalPaid = result.total_paid || 0;
            
            // Get installment details
            db.get('SELECT amount FROM installments WHERE id = ?', [oldPayment.installment_id], (err, installment) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              const newStatus = totalPaid >= installment.amount ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');

              db.run(
                'UPDATE installments SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [totalPaid, newStatus, oldPayment.installment_id],
                (err) => {
                  if (err) {
                    return res.status(500).json({ error: 'Error updating installment' });
                  }

                  res.json({ message: 'Payment updated successfully' });
                }
              );
            });
          }
        );
      }
    );
  });
});

// Delete payment
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Get payment details
  db.get('SELECT * FROM payments WHERE id = ?', [id], (err, payment) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Delete payment
    db.run('DELETE FROM payments WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Recalculate installment paid amount
      db.get(
        'SELECT SUM(amount) as total_paid FROM payments WHERE installment_id = ?',
        [payment.installment_id],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const totalPaid = result.total_paid || 0;
          
          // Get installment details
          db.get('SELECT amount FROM installments WHERE id = ?', [payment.installment_id], (err, installment) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            const newStatus = totalPaid >= installment.amount ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');

            db.run(
              'UPDATE installments SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [totalPaid, newStatus, payment.installment_id],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Error updating installment' });
                }

                res.json({ message: 'Payment deleted successfully' });
              }
            );
          });
        }
      );
    });
  });
});

// Get payment methods summary
router.get('/methods/summary', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      payment_method,
      COUNT(*) as count,
      SUM(amount) as total_amount
    FROM payments 
    GROUP BY payment_method
    ORDER BY total_amount DESC
  `;

  db.all(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

module.exports = router;