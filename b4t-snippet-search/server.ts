import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import pkg from 'pg';
import crypto from 'crypto';
const { Pool } = pkg;

// Use the database URL from the environment
// Make sure to set NEON_DATABASE_URL or DATABASE_URL in your AI Studio secrets
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create users table on startup
const setupAuthTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminUsername && adminPassword) {
      const pwdHash = hashPassword(adminPassword);
      const adminCheck = await pool.query('SELECT * FROM app_users WHERE username = $1', [adminUsername]);
      if (adminCheck.rows.length === 0) {
        await pool.query('INSERT INTO app_users (username, password_hash) VALUES ($1, $2)', [adminUsername, pwdHash]);
        console.log(`Admin user created from environment variables: ${adminUsername}`);
      } else {
        await pool.query('UPDATE app_users SET password_hash = $2 WHERE username = $1', [adminUsername, pwdHash]);
        console.log(`Admin user password synchronized from environment variables.`);
      }
    } else {
      console.log("ADMIN_USERNAME or ADMIN_PASSWORD not provided. Skipping default admin user creation.");
    }
    
    console.log("Auth table setup completed.");
  } catch (e) {
    console.error("Failed to setup auth table", e);
  }
};
setupAuthTable();

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Authentication Endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
      
      const pwdHash = hashPassword(password);
      await pool.query('INSERT INTO app_users (username, password_hash) VALUES ($1, $2)', [username, pwdHash]);
      res.json({ success: true, message: 'User registered' });
    } catch (err: any) {
      if (err.code === '23505') { // Unique violation
        res.status(400).json({ error: 'Username already exists' });
      } else {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
      
      const pwdHash = hashPassword(password);
      const { rows } = await pool.query('SELECT * FROM app_users WHERE username = $1 AND password_hash = $2', [username, pwdHash]);
      
      if (rows.length > 0) {
        const isAdmin = rows[0].username === process.env.ADMIN_USERNAME;
        res.json({ success: true, user: { id: rows[0].id, username: rows[0].username, isAdmin } });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // API endpoint to fetch the prepared report from Neon DB
  app.post('/api/bill4time/sync', async (req, res) => {
    try {
      // Direct fast query to the pre-calculated reporting table
      const { rows } = await pool.query('SELECT * FROM dyn_snippet_search_master ORDER BY "Client Name" ASC');
      
      // Map the PostgreSQL row columns to our frontend's expected properties
      const mappedRecords = rows.map(row => ({
        clientId: row['Client ID']?.toString() || row['client id']?.toString() || '',
        clientName: row['Client Name'] || row['client name'] || '',
        email: row['Email'] || row['email'] || '',
        phone: row['Phone'] || row['phone'] || '',
        totalBalance: parseFloat(row['Total Balance'] || row['total balance']) || 0,
        retainerPaid: parseFloat(row['Retainer Paid'] || row['retainer paid']) || 0,
        totalAmountPaid: parseFloat(row['Total Amount Paid'] || row['total amount paid']) || 0,
        status: row['Status'] || row['status'] || '',
        assignedTo: row['Assigned To'] || row['assigned to'] || '',
        outstandingBalance: parseFloat(row['Outstanding Balance'] || row['outstanding balance']) || 0,
        unbilledBalance: parseFloat(row['Unbilled Balance'] || row['unbilled balance']) || 0,
        dateOpened: row['Date Opened'] || row['date opened'] || '',
        type: row['Type'] || row['type'] || '',
        paymentType: row['Payment Type'] || row['payment type'] || '',
        paymentTerms: row['Payment Terms'] || row['payment terms'] || '',
        lastPayment: row['Last Payment'] || row['last payment'] || '',
        lastPaymentDate: row['Last Payment Date'] || row['last payment date'] || '',
        totalLaborHours: parseFloat(row['Total Labor Hours'] || row['total labor hours']) || 0,
        totalBillableHours: parseFloat(row['Total Billable Hours'] || row['total billable hours']) || 0,
        firstAttorney: row['First Attorney'] || row['first attorney'] || '',
        lastAttorney: row['Last Attorney'] || row['last attorney'] || '',
        adminWelcomeCall: row['Admin Welcome Call'] || row['admin welcome call'] || '',
        adminWelcomeDate: row['Date Of Admin Welcome Call'] || row['date of admin welcome call'] || '',
        attyWelcomeDate: row['Date Time Of Atty WC'] || row['date time of atty wc'] || '',
        callNotes: row['Call_Notes_Plain'] || row['call_notes_plain'] || '',
        tClientCareNotes: row['T_ClientCare_Notes'] || row['t_clientcare_notes'] || ''
      }));

      res.json(mappedRecords);
    } catch (err: any) {
      console.error('[Neon DB Sync Error]:', err);
      // Failsafe format so the frontend can catch it and display offline fallback
      res.status(500).json({ 
        error: 'Failed to sync with Neon DB', 
        details: err?.message,
        missingTable: err?.message?.includes('does not exist') 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
