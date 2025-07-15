const express = require('express');
const XLSX = require('xlsx');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get monthly payment report
router.get('/monthly-payments', authenticateToken, (req, res) => {
  const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

  const query = `
    SELECT 
      DATE(p.payment_date) as date,
      COUNT(*) as payment_count,
      SUM(p.amount) as total_amount,
      p.payment_method
    FROM payments p
    WHERE strftime('%Y', p.payment_date) = ? AND strftime('%m', p.payment_date) = ?
    GROUP BY DATE(p.payment_date), p.payment_method
    ORDER BY date DESC
  `;

  db.all(query, [year.toString(), month.toString().padStart(2, '0')], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get overdue report
router.get('/overdue', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      c.name as customer_name,
      c.phone as customer_phone,
      ct.contract_number,
      i.installment_number,
      i.amount,
      i.due_date,
      i.paid_amount,
      (i.amount - i.paid_amount) as remaining_amount,
      JULIANDAY('now') - JULIANDAY(i.due_date) as days_overdue
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN customers c ON ct.customer_id = c.id
    WHERE i.status = 'pending' AND DATE(i.due_date) < DATE('now')
    ORDER BY i.due_date ASC
  `;

  db.all(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get income report
router.get('/income', authenticateToken, (req, res) => {
  const { date_from, date_to, period = 'monthly' } = req.query;

  let dateFormat = '%Y-%m';
  if (period === 'daily') dateFormat = '%Y-%m-%d';
  if (period === 'yearly') dateFormat = '%Y';

  let whereClause = '';
  let params = [];

  if (date_from && date_to) {
    whereClause = 'WHERE DATE(p.payment_date) BETWEEN ? AND ?';
    params = [date_from, date_to];
  }

  const query = `
    SELECT 
      strftime('${dateFormat}', p.payment_date) as period,
      COUNT(*) as payment_count,
      SUM(p.amount) as total_income,
      AVG(p.amount) as average_payment
    FROM payments p
    ${whereClause}
    GROUP BY strftime('${dateFormat}', p.payment_date)
    ORDER BY period DESC
  `;

  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get customer payment history
router.get('/customer-payments/:customer_id', authenticateToken, (req, res) => {
  const { customer_id } = req.params;

  const query = `
    SELECT 
      p.*,
      i.installment_number,
      i.amount as installment_amount,
      ct.contract_number
    FROM payments p
    JOIN installments i ON p.installment_id = i.id
    JOIN contracts ct ON i.contract_id = ct.id
    WHERE ct.customer_id = ?
    ORDER BY p.payment_date DESC
  `;

  db.all(query, [customer_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Export report to Excel
router.get('/export/:type', authenticateToken, (req, res) => {
  const { type } = req.params;
  const { date_from, date_to } = req.query;

  let query = '';
  let params = [];
  let filename = '';

  switch (type) {
    case 'payments':
      query = `
        SELECT 
          p.payment_date,
          c.name as customer_name,
          ct.contract_number,
          i.installment_number,
          p.amount,
          p.payment_method,
          p.reference_number
        FROM payments p
        JOIN installments i ON p.installment_id = i.id
        JOIN contracts ct ON i.contract_id = ct.id
        JOIN customers c ON ct.customer_id = c.id
        WHERE DATE(p.payment_date) BETWEEN ? AND ?
        ORDER BY p.payment_date DESC
      `;
      params = [date_from, date_to];
      filename = `payments_${date_from}_to_${date_to}.xlsx`;
      break;

    case 'overdue':
      query = `
        SELECT 
          c.name as customer_name,
          c.phone as customer_phone,
          ct.contract_number,
          i.installment_number,
          i.amount,
          i.due_date,
          i.paid_amount,
          (i.amount - i.paid_amount) as remaining_amount,
          JULIANDAY('now') - JULIANDAY(i.due_date) as days_overdue
        FROM installments i
        JOIN contracts ct ON i.contract_id = ct.id
        JOIN customers c ON ct.customer_id = c.id
        WHERE i.status = 'pending' AND DATE(i.due_date) < DATE('now')
        ORDER BY i.due_date ASC
      `;
      filename = `overdue_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      break;

    case 'customers':
      query = `
        SELECT 
          c.name,
          c.phone,
          c.email,
          c.address,
          c.status,
          COUNT(ct.id) as total_contracts,
          SUM(CASE WHEN ct.status = 'active' THEN 1 ELSE 0 END) as active_contracts,
          SUM(ct.total_amount) as total_amount
        FROM customers c
        LEFT JOIN contracts ct ON c.id = ct.customer_id
        GROUP BY c.id
        ORDER BY c.name
      `;
      filename = `customers_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      break;

    default:
      return res.status(400).json({ error: 'Invalid report type' });
  }

  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified criteria' });
    }

    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(results);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');

    // Generate buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    res.send(buffer);
  });
});

// Get collection performance report
router.get('/collection-performance', authenticateToken, (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const query = `
    SELECT 
      strftime('%Y-%m', i.due_date) as month,
      COUNT(*) as total_installments,
      SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
      SUM(CASE WHEN i.status = 'pending' AND DATE(i.due_date) < DATE('now') THEN 1 ELSE 0 END) as overdue_installments,
      SUM(i.amount) as total_amount_due,
      SUM(i.paid_amount) as total_amount_paid,
      (SUM(i.paid_amount) * 100.0 / SUM(i.amount)) as collection_rate
    FROM installments i
    WHERE strftime('%Y', i.due_date) = ?
    GROUP BY strftime('%Y-%m', i.due_date)
    ORDER BY month
  `;

  db.all(query, [year.toString()], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get top customers by payment amount
router.get('/top-customers', authenticateToken, (req, res) => {
  const { limit = 10 } = req.query;

  const query = `
    SELECT 
      c.name as customer_name,
      c.phone,
      COUNT(p.id) as total_payments,
      SUM(p.amount) as total_amount_paid,
      AVG(p.amount) as average_payment
    FROM customers c
    JOIN contracts ct ON c.id = ct.customer_id
    JOIN installments i ON ct.id = i.contract_id
    JOIN payments p ON i.id = p.installment_id
    GROUP BY c.id
    ORDER BY total_amount_paid DESC
    LIMIT ?
  `;

  db.all(query, [limit], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

module.exports = router;