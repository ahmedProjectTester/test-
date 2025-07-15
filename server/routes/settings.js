const express = require('express');
const { db } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      s.*,
      u.full_name as updated_by_name
    FROM settings s
    LEFT JOIN users u ON s.updated_by = u.id
    ORDER BY s.key
  `;

  db.all(query, (err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(settings);
  });
});

// Get setting by key
router.get('/:key', authenticateToken, (req, res) => {
  const { key } = req.params;

  const query = `
    SELECT 
      s.*,
      u.full_name as updated_by_name
    FROM settings s
    LEFT JOIN users u ON s.updated_by = u.id
    WHERE s.key = ?
  `;

  db.get(query, [key], (err, setting) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(setting);
  });
});

// Update setting (admin only)
router.put('/:key', authenticateToken, requireRole(['admin']), (req, res) => {
  const { key } = req.params;
  const { value, description } = req.body;

  if (!value) {
    return res.status(400).json({ error: 'Value is required' });
  }

  db.run(
    'UPDATE settings SET value = ?, description = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
    [value, description, req.user.id, key],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Setting not found' });
      }

      res.json({ message: 'Setting updated successfully' });
    }
  );
});

// Create new setting (admin only)
router.post('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const { key, value, description } = req.body;

  if (!key || !value) {
    return res.status(400).json({ error: 'Key and value are required' });
  }

  db.run(
    'INSERT INTO settings (key, value, description, updated_by) VALUES (?, ?, ?, ?)',
    [key, value, description, req.user.id],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'Setting with this key already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({
        message: 'Setting created successfully',
        setting: {
          id: this.lastID,
          key,
          value,
          description
        }
      });
    }
  );
});

// Delete setting (admin only)
router.delete('/:key', authenticateToken, requireRole(['admin']), (req, res) => {
  const { key } = req.params;

  db.run('DELETE FROM settings WHERE key = ?', [key], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully' });
  });
});

// Get system configuration
router.get('/config/system', authenticateToken, (req, res) => {
  const query = `
    SELECT key, value 
    FROM settings 
    WHERE key IN ('currency', 'default_installment_period', 'late_fee_percentage', 'notification_days_before')
  `;

  db.all(query, (err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Convert array to object for easier access
    const config = {};
    settings.forEach(setting => {
      config[setting.key] = setting.value;
    });

    res.json(config);
  });
});

// Get company information
router.get('/config/company', authenticateToken, (req, res) => {
  const query = `
    SELECT key, value 
    FROM settings 
    WHERE key IN ('company_name', 'company_address', 'company_phone', 'company_email')
  `;

  db.all(query, (err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Convert array to object for easier access
    const config = {};
    settings.forEach(setting => {
      config[setting.key] = setting.value;
    });

    res.json(config);
  });
});

// Update system configuration (admin only)
router.put('/config/system', authenticateToken, requireRole(['admin']), (req, res) => {
  const { currency, default_installment_period, late_fee_percentage, notification_days_before } = req.body;

  const updates = [];
  const params = [];

  if (currency) {
    updates.push('UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    params.push([currency, req.user.id, 'currency']);
  }

  if (default_installment_period) {
    updates.push('UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    params.push([default_installment_period, req.user.id, 'default_installment_period']);
  }

  if (late_fee_percentage) {
    updates.push('UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    params.push([late_fee_percentage, req.user.id, 'late_fee_percentage']);
  }

  if (notification_days_before) {
    updates.push('UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    params.push([notification_days_before, req.user.id, 'notification_days_before']);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid settings provided' });
  }

  // Execute all updates
  const updatePromises = updates.map((query, index) => {
    return new Promise((resolve, reject) => {
      db.run(query, params[index], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  });

  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: 'System configuration updated successfully' });
    })
    .catch(err => {
      res.status(500).json({ error: 'Error updating system configuration' });
    });
});

// Update company information (admin only)
router.put('/config/company', authenticateToken, requireRole(['admin']), (req, res) => {
  const { company_name, company_address, company_phone, company_email } = req.body;

  const updates = [];
  const params = [];

  if (company_name) {
    updates.push('UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    params.push([company_name, req.user.id, 'company_name']);
  }

  if (company_address) {
    updates.push('UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    params.push([company_address, req.user.id, 'company_address']);
  }

  if (company_phone) {
    updates.push('UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    params.push([company_phone, req.user.id, 'company_phone']);
  }

  if (company_email) {
    updates.push('UPDATE settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    params.push([company_email, req.user.id, 'company_email']);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid settings provided' });
  }

  // Execute all updates
  const updatePromises = updates.map((query, index) => {
    return new Promise((resolve, reject) => {
      db.run(query, params[index], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  });

  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: 'Company information updated successfully' });
    })
    .catch(err => {
      res.status(500).json({ error: 'Error updating company information' });
    });
});

// Backup database (admin only)
router.post('/backup', authenticateToken, requireRole(['admin']), (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const backupDir = path.join(__dirname, '../backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup_${timestamp}.db`);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Copy database file
  const dbPath = path.join(__dirname, '../database/installment_system.db');
  
  try {
    fs.copyFileSync(dbPath, backupPath);
    res.json({ 
      message: 'Database backup created successfully',
      backup_file: `backup_${timestamp}.db`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating backup' });
  }
});

// Get backup list (admin only)
router.get('/backups', authenticateToken, requireRole(['admin']), (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    return res.json([]);
  }

  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created_at: stats.mtime
        };
      })
      .sort((a, b) => b.created_at - a.created_at);

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Error reading backup directory' });
  }
});

module.exports = router;