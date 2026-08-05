const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 100');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/', async (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [result] = await pool.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email || null]);
    const [rows] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
