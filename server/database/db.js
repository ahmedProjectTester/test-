const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'installment_system.db');
const db = new sqlite3.Database(dbPath);

const initializeDatabase = () => {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'employee',
        full_name TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        national_id TEXT,
        status TEXT DEFAULT 'regular',
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Contracts table
    db.run(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        contract_number TEXT UNIQUE NOT NULL,
        total_amount REAL NOT NULL,
        installment_amount REAL NOT NULL,
        number_of_installments INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        interest_rate REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        description TEXT,
        responsible_employee INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (responsible_employee) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Installments table
    db.run(`
      CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL,
        installment_number INTEGER NOT NULL,
        amount REAL NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        late_fee REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id)
      )
    `);

    // Payments table
    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        installment_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_date DATE NOT NULL,
        payment_method TEXT NOT NULL,
        reference_number TEXT,
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (installment_id) REFERENCES installments(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Alerts table
    db.run(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        priority TEXT DEFAULT 'medium',
        customer_id INTEGER,
        contract_id INTEGER,
        installment_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (contract_id) REFERENCES contracts(id),
        FOREIGN KEY (installment_id) REFERENCES installments(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_by INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // Insert default admin user if not exists
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password, role, full_name)
      VALUES ('admin', 'admin@installment.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Administrator')
    `);

    // Insert default settings
    const defaultSettings = [
      ['currency', 'USD', 'Default currency for the system'],
      ['default_installment_period', '30', 'Default installment period in days'],
      ['late_fee_percentage', '5', 'Late fee percentage per installment'],
      ['notification_days_before', '3', 'Days before due date to send notifications'],
      ['company_name', 'Installment Management System', 'Company name for reports'],
      ['company_address', '', 'Company address for reports'],
      ['company_phone', '', 'Company phone for reports'],
      ['company_email', '', 'Company email for reports']
    ];

    defaultSettings.forEach(([key, value, description]) => {
      db.run(`
        INSERT OR IGNORE INTO settings (key, value, description)
        VALUES (?, ?, ?)
      `, [key, value, description]);
    });

    console.log('Database initialized successfully');
  });
};

module.exports = {
  db,
  initializeDatabase
};