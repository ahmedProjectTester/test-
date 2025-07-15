const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, (req, res) => {
  const queries = [
    // Total customers
    `SELECT COUNT(*) as total_customers FROM customers`,
    
    // Total contracts
    `SELECT COUNT(*) as total_contracts FROM contracts WHERE status = 'active'`,
    
    // Paid installments this month
    `SELECT COUNT(*) as paid_installments FROM installments 
     WHERE status = 'paid' AND DATE(paid_date) >= DATE('now', 'start of month')`,
    
    // Late installments
    `SELECT COUNT(*) as late_installments FROM installments 
     WHERE status = 'pending' AND DATE(due_date) < DATE('now')`,
    
    // Total revenue this month
    `SELECT SUM(amount) as monthly_revenue FROM payments 
     WHERE DATE(payment_date) >= DATE('now', 'start of month')`,
    
    // Total pending amount
    `SELECT SUM(amount - paid_amount) as pending_amount FROM installments 
     WHERE status = 'pending'`,
    
    // Unread alerts
    `SELECT COUNT(*) as unread_alerts FROM alerts WHERE is_read = FALSE`
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.get(query, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }))
  .then(results => {
    res.json({
      total_customers: results[0].total_customers || 0,
      total_contracts: results[1].total_contracts || 0,
      paid_installments: results[2].paid_installments || 0,
      late_installments: results[3].late_installments || 0,
      monthly_revenue: results[4].monthly_revenue || 0,
      pending_amount: results[5].pending_amount || 0,
      unread_alerts: results[6].unread_alerts || 0
    });
  })
  .catch(err => {
    res.status(500).json({ error: 'Database error' });
  });
});

// Get payment trends for chart
router.get('/payment-trends', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      DATE(payment_date) as date,
      COUNT(*) as payment_count,
      SUM(amount) as total_amount
    FROM payments 
    WHERE DATE(payment_date) >= DATE('now', '-30 days')
    GROUP BY DATE(payment_date)
    ORDER BY date
  `;

  db.all(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get installment status distribution
router.get('/installment-status', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      status,
      COUNT(*) as count,
      SUM(amount) as total_amount
    FROM installments 
    GROUP BY status
  `;

  db.all(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get recent activities
router.get('/recent-activities', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      'payment' as type,
      p.id,
      p.amount,
      p.payment_date as date,
      c.name as customer_name,
      ct.contract_number
    FROM payments p
    JOIN installments i ON p.installment_id = i.id
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    WHERE DATE(p.payment_date) >= DATE('now', '-7 days')
    
    UNION ALL
    
    SELECT 
      'contract' as type,
      ct.id,
      ct.total_amount as amount,
      ct.created_at as date,
      c.name as customer_name,
      ct.contract_number
    FROM contracts ct
    JOIN customers c ON ct.customer_id = c.id
    WHERE DATE(ct.created_at) >= DATE('now', '-7 days')
    
    ORDER BY date DESC
    LIMIT 10
  `;

  db.all(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get upcoming due dates
router.get('/upcoming-dues', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      i.id,
      i.installment_number,
      i.amount,
      i.due_date,
      c.name as customer_name,
      ct.contract_number
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    WHERE i.status = 'pending' 
    AND DATE(i.due_date) BETWEEN DATE('now') AND DATE('now', '+7 days')
    ORDER BY i.due_date ASC
    LIMIT 10
  `;

  db.all(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

module.exports = router;