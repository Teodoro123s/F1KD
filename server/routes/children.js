const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to normalize incoming body keys (accept camelCase or snake_case)
function getField(body, ...keys) {
  for (const k of keys) {
    if (body[k] !== undefined) return body[k];
  }
  return null;
}

// POST /api/children - create a child
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    let motherId = getField(b, 'motherId', 'mother_id');
    const communityId = getField(b, 'communityId', 'community_id');
    const batchId = getField(b, 'batchId', 'batch_id');
    const firstName = getField(b, 'firstName', 'first_name');
    const middleName = getField(b, 'middleName', 'middle_name');
    const lastName = getField(b, 'lastName', 'last_name');
    const suffix = getField(b, 'suffix');
    const birthDate = getField(b, 'birthDate', 'birth_date');
    const birthWeight = getField(b, 'birthWeight', 'birth_weight');
    const birthLength = getField(b, 'birthLength', 'birth_length');
    const gender = getField(b, 'gender');
    const deliveryType = getField(b, 'deliveryType', 'delivery_type');
    const healthStatus = getField(b, 'healthStatus', 'health_status');
    const birthPlace = getField(b, 'birthPlace', 'birth_place');
    const birthAttendant = getField(b, 'birthAttendant', 'birth_attendant');
    const apgarScore = getField(b, 'apgarScore', 'apgar_score');
    const feedingType = getField(b, 'feedingType', 'feeding_type');
    const nutritionNotes = getField(b, 'nutritionNotes', 'nutrition_notes');

    if (!motherId || !firstName || !lastName) return res.status(400).json({ error: 'motherId, firstName and lastName are required' });

    const [motherRows] = await pool.query(
      'SELECT id FROM mothers WHERE id = ? OR mother_code = ? OR mother_external_id = ? LIMIT 1',
      [Number(motherId) || null, motherId, motherId]
    );
    if (!motherRows.length) return res.status(400).json({ error: 'Mother not found' });
    motherId = motherRows[0].id;

    // generate child_code
    const childCode = `C-${Date.now()}`;

    const fatherName = getField(b, 'fatherName', 'father_name');
    const relationship = getField(b, 'relationship');
    const address = getField(b, 'address');

    const [result] = await pool.query(
      `INSERT INTO children (child_code, mother_id, community_id, batch_id, first_name, middle_name, last_name, suffix, birth_date, birth_weight, birth_length, gender, delivery_type, health_status, birth_place, birth_attendant, apgar_score, feeding_type, nutrition_notes, father_name, relationship, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [childCode, motherId || null, communityId || null, batchId || null, firstName, middleName || null, lastName, suffix || null, birthDate || null, birthWeight || null, birthLength || null, gender || null, deliveryType || null, healthStatus || null, birthPlace || null, birthAttendant || null, apgarScore || null, feedingType || null, nutritionNotes || null, fatherName || null, relationship || null, address || null]
    );

    const [rows] = await pool.query('SELECT * FROM children WHERE id = ?', [result.insertId]);
    res.status(201).json({ child: rows[0] });
  } catch (err) {
    console.error('Failed to create child', err);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/children/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT c.*, m.first_name AS mother_first_name, m.last_name AS mother_last_name, m.mother_code AS mother_code
       FROM children c
       LEFT JOIN mothers m ON c.mother_id = m.id
       WHERE c.id = ? OR c.child_code = ?`,
      [id, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ child: rows[0] });
  } catch (err) {
    console.error('Failed to fetch child', err);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/mothers/:motherId/children
router.get('/mother/:motherId/children', async (req, res) => {
  try {
    const { motherId } = req.params;
    const [rows] = await pool.query('SELECT * FROM children WHERE mother_id = ? ORDER BY created_at DESC', [motherId]);
    res.json({ children: rows });
  } catch (err) {
    console.error('Failed to fetch children for mother', err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
