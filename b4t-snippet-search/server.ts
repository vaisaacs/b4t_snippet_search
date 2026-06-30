import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import pkg from 'pg';
import crypto from 'crypto';
const { Pool } = pkg;

// Use the database URL from the environment
// Make sure to set NEON_DATABASE_URL or DATABASE_URL in your AI Studio secrets
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const poolDisabled = new Pool({
  connectionString: process.env.NEON_DATABASE_URL_DISABLED,
  ssl: {
    rejectUnauthorized: false
  }
});

const poolInoffice = new Pool({
  connectionString: process.env.NEON_DATABASE_URL_INOFFICE,
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
      
      let lastSync = null;
      try {
        const syncRes = await pool.query('SELECT last_sync FROM sync_metadata ORDER BY id DESC LIMIT 1');
        if (syncRes.rows.length > 0) {
          lastSync = syncRes.rows[0].last_sync;
        }
      } catch (err) {
        // Table might not exist yet
      }
      
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

      res.json({ records: mappedRecords, lastSync });
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

  // API endpoint to fetch the prepared report for disabled clients from Neon DB
  app.post('/api/bill4time/sync_disabled', async (req, res) => {
    try {
      if (!process.env.NEON_DATABASE_URL_DISABLED) {
        throw new Error('NEON_DATABASE_URL_DISABLED environment variable is not configured on the server.');
      }
      const { rows } = await poolDisabled.query('SELECT * FROM dyn_snippet_disabled_clients ORDER BY "Client Name" ASC');
      
      let lastSync = null;
      try {
        const syncRes = await poolDisabled.query('SELECT last_sync FROM sync_metadata ORDER BY id DESC LIMIT 1');
        if (syncRes.rows.length > 0) {
          lastSync = syncRes.rows[0].last_sync;
        }
      } catch (err) {
        // Table might not exist yet
      }
      
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
        callNotes: (row['Latest Call Note'] || '') + '\n\n' + (row['All Call Notes'] || ''),
        tClientCareNotes: [
          row['T1 Call Notes'] || row['t1 call notes'],
          row['T2 Call Notes'] || row['t2 call notes'],
          row['T3 Call Notes'] || row['t3 call notes'],
          row['T4 Call Notes'] || row['t4 call notes'],
          row['T5 Call Notes'] || row['t5 call notes']
        ].filter(Boolean).join('\n')
      }));

      res.json({ records: mappedRecords, lastSync });
    } catch (err: any) {
      console.error('[Neon DB Sync Error (Disabled)]:', err);
      res.status(500).json({ 
        error: 'Failed to sync with Neon DB', 
        details: err?.message,
        missingTable: err?.message?.includes('does not exist') 
      });
    }
  });

  // API endpoint to fetch the prepared report for in-office clients from Neon DB
  app.post('/api/bill4time/sync_inoffice', async (req, res) => {
    try {
      if (!process.env.NEON_DATABASE_URL_INOFFICE) {
        throw new Error('NEON_DATABASE_URL_INOFFICE environment variable is not configured on the server.');
      }
      const { rows } = await poolInoffice.query('SELECT * FROM dyn_snippet_inoffice_clients ORDER BY "Client Name" ASC');
      
      let lastSync = null;
      try {
        const syncRes = await poolInoffice.query('SELECT last_sync FROM sync_metadata ORDER BY id DESC LIMIT 1');
        if (syncRes.rows.length > 0) {
          lastSync = syncRes.rows[0].last_sync;
        }
      } catch (err) {
        // Table might not exist yet
      }
      
      const mappedRecords = rows.map(row => ({
        clientId: row['Matter ID']?.toString() || row['matter id']?.toString() || '',
        clientName: row['Client Name'] || row['client name'] || '',
        email: row['Email Address'] || row['email address'] || '',
        phone: row['Phone Number'] || row['phone number'] || '',
        totalBalance: parseFloat(row['Total Balance'] || row['total balance']) || 0,
        retainerPaid: 0,
        totalAmountPaid: 0,
        status: row['Status'] || row['status'] || '',
        assignedTo: row['Assigned Attorney'] || row['assigned attorney'] || '',
        outstandingBalance: parseFloat(row['Outstanding Balance'] || row['outstanding balance']) || 0,
        unbilledBalance: parseFloat(row['Unbilled Balance'] || row['unbilled balance']) || 0,
        dateOpened: '',
        type: row['Matter Type'] || row['matter type'] || '',
        paymentType: '',
        paymentTerms: '',
        lastPayment: row['Last Payment'] || row['last payment'] || '',
        lastPaymentDate: row['Last Payment Date'] || row['last payment date'] || '',
        totalLaborHours: 0,
        totalBillableHours: 0,
        firstAttorney: row['First Attorney'] || row['first attorney'] || '',
        lastAttorney: row['Last Attorney'] || row['last attorney'] || '',
        adminWelcomeCall: '',
        adminWelcomeDate: '',
        attyWelcomeDate: '',
        callNotes: '',
        tClientCareNotes: ''
      }));

      res.json({ records: mappedRecords, lastSync });
    } catch (err: any) {
      console.error('[Neon DB Sync Error (In-Office)]:', err);
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
