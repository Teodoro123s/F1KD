const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

async function insertUsers() {
  try {
    const samples = [
      { username: 'alice', email: 'alice@example.com', full_name: 'Alice Rivera', role: 'Admin', status: 'active', password: 'Alice1234' },
      { username: 'bob', email: 'bob@example.com', full_name: 'Bob Santos', role: 'User', status: 'active', password: 'Bob12345' },
      { username: 'carla', email: 'carla@example.com', full_name: 'Carla Dela Cruz', role: 'User', status: 'active', password: 'Carla123' }
    ];

    for (const s of samples) {
      const [[exists]] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [s.username, s.email]);
      if (exists && exists.id) {
        console.log('User exists, skipping:', s.username);
        continue;
      }
      const hash = await bcrypt.hash(s.password, 10);
      await pool.query('INSERT INTO users (username, email, full_name, role, status, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [s.username, s.email, s.full_name, s.role, s.status, hash]);
      console.log('Inserted user', s.username);
    }

    // ensure superadmin exists (should already exist)
    const [[admin]] = await pool.query("SELECT id, username, role FROM users WHERE username = 'superadmin' LIMIT 1");
    if (!admin || !admin.id) {
      // create one if missing
      const hash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'Welcome123!', 10);
      const username = process.env.DEFAULT_ADMIN_USERNAME || 'superadmin';
      const email = process.env.DEFAULT_ADMIN_EMAIL || 'Superadmin@gmail.com';
      await pool.query('INSERT INTO users (username, email, full_name, role, status, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, 'Super Admin', 'Superadmin', 'active', hash]);
      const [[a2]] = await pool.query("SELECT id, username, role FROM users WHERE username = ?", [username]);
      console.log('Created superadmin', a2.username);
    } else {
      console.log('Superadmin exists:', admin.username);
    }

    // get admin id
    const [[adminRow]] = await pool.query("SELECT id, username, role FROM users WHERE username = 'superadmin' LIMIT 1");
    const adminId = adminRow.id;

    // create JWT for superadmin
    const token = jwt.sign({ id: adminId, username: adminRow.username, role: 'Superadmin' }, JWT_SECRET, { expiresIn: '2h' });
    console.log('JWT for superadmin created (truncated):', token.substr(0,40) + '...');

    // Test add-user endpoint: create a user via API
    const newUser = { username: 'donna', email: 'donna@example.com', fullName: 'Donna Perez', role: 'User', status: 'active', password: 'Donna1234' };

    const postData = JSON.stringify({ username: newUser.username, email: newUser.email, password: newUser.password, fullName: newUser.fullName, role: newUser.role, status: newUser.status });

    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 4000,
      path: '/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer ' + token
      }
    };

    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
          console.log('API /api/users status:', res.statusCode);
          try { console.log('API response:', JSON.parse(data)); } catch(e){ console.log('API response raw:', data); }
          resolve();
        });
      });
      req.on('error', (e) => { console.error('Request error', e); reject(e); });
      req.write(postData);
      req.end();
    });

    await pool.end();
  } catch (err) {
    console.error('ERR', err);
    try { await pool.end(); } catch(e) {}
    process.exit(1);
  }
}

insertUsers();
