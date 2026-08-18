const express = require('express');
const router = express.Router();
const pool = require('../db');

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function mapMother(row) {
  const fullName = [
    firstNonEmpty(row.first_name, row.firstName),
    firstNonEmpty(row.middle_name, row.middleName),
    firstNonEmpty(row.last_name, row.lastName),
    firstNonEmpty(row.suffix),
  ].filter((v) => String(v).trim()).join(' ').trim();

  return {
    id: row.mother_code || String(row.id),
    motherId: row.mother_external_id || row.mother_code || String(row.id),
    name: fullName || (row.name || ''),
    firstName: firstNonEmpty(row.first_name, row.firstName, ''),
    middleName: firstNonEmpty(row.middle_name, row.middleName, ''),
    lastName: firstNonEmpty(row.last_name, row.lastName, ''),
    suffix: firstNonEmpty(row.suffix, ''),
    dob: row.dob || '',
    contactNumber: row.contact_number || row.contactNumber || '',
    address: row.address || '',
    community: row.community || row.area || '',
    area: row.area || row.community || '',
    groupId: row.group_id ?? null,
    batchId: row.batch_id ?? null,
    status: row.status || 'Active',
    progress: Number(row.progress || 0),
    records: Number(row.children_count || row.records || 0),
    childrenCount: Number(row.children_count || row.records || 0),
    raw: row,
  };
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*,
        (SELECT COUNT(*) FROM children c WHERE c.mother_id = m.id) AS children_count
      FROM mothers m
      ORDER BY m.id DESC
    `);

    res.json({ mothers: rows.map(mapMother) });
  } catch (error) {
    console.error('[Mothers API] GET / error:', error);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const firstName = firstNonEmpty(b.firstName, b.first_name);
    const middleName = firstNonEmpty(b.middleName, b.middle_name);
    const lastName = firstNonEmpty(b.lastName, b.last_name);
    const suffix = firstNonEmpty(b.suffix, '');
    const motherCode = firstNonEmpty(b.motherCode, b.mother_code, `MTH-${Date.now()}`);
    const motherExternalId = firstNonEmpty(b.motherId, b.mother_id, b.motherExternalId, b.mother_external_id, motherCode);

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO mothers (
        mother_code,
        first_name,
        middle_name,
        last_name,
        suffix,
        dob,
        contact_number,
        community,
        area,
        mother_external_id,
        address,
        group_id,
        batch_id,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        motherCode,
        firstName,
        middleName || null,
        lastName,
        suffix || null,
        firstNonEmpty(b.dob, b.birthDate, null),
        firstNonEmpty(b.contactNumber, b.contact_number, null),
        firstNonEmpty(b.community, b.community_name, ''),
        firstNonEmpty(b.area, ''),
        motherExternalId,
        firstNonEmpty(b.address, ''),
        b.groupId ?? b.group_id ?? null,
        b.batchId ?? b.batch_id ?? null,
        firstNonEmpty(b.status, 'Active'),
      ]
    );

    const [rows] = await pool.query('SELECT * FROM mothers WHERE id = ?', [result.insertId]);
    const mother = rows[0];
    res.status(201).json({ mother: mapMother(mother) });
  } catch (error) {
    console.error('[Mothers API] POST / error:', error);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT m.*,
        (SELECT COUNT(*) FROM children c WHERE c.mother_id = m.id) AS children_count
       FROM mothers m
       WHERE m.id = ? OR m.mother_code = ? OR m.mother_external_id = ?
       LIMIT 1`,
      [Number(id) || null, id, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Mother not found' });
    }

    res.json({ mother: mapMother(rows[0]) });
  } catch (error) {
    console.error('[Mothers API] GET /:id error:', error);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const firstName = firstNonEmpty(b.firstName, b.first_name);
    const middleName = firstNonEmpty(b.middleName, b.middle_name);
    const lastName = firstNonEmpty(b.lastName, b.last_name);
    const suffix = firstNonEmpty(b.suffix, '');

    const [existing] = await pool.query('SELECT * FROM mothers WHERE id = ? OR mother_code = ? LIMIT 1', [Number(id) || null, id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'Mother not found' });
    }

    const current = existing[0];
    const values = [
      firstNonEmpty(firstName, current.first_name),
      firstNonEmpty(middleName, current.middle_name),
      firstNonEmpty(lastName, current.last_name),
      firstNonEmpty(suffix, current.suffix),
      firstNonEmpty(b.dob, current.dob),
      firstNonEmpty(b.contactNumber, b.contact_number, current.contact_number),
      firstNonEmpty(b.community, current.community),
      firstNonEmpty(b.area, current.area),
      firstNonEmpty(b.motherId, b.mother_id, b.motherExternalId, b.mother_external_id, current.mother_external_id),
      firstNonEmpty(b.address, current.address),
      b.groupId ?? b.group_id ?? current.group_id,
      b.batchId ?? b.batch_id ?? current.batch_id,
      firstNonEmpty(b.status, current.status || 'Active'),
      Number(id) || current.id,
    ];

    await pool.query(
      `UPDATE mothers SET
        first_name = ?,
        middle_name = ?,
        last_name = ?,
        suffix = ?,
        dob = ?,
        contact_number = ?,
        community = ?,
        area = ?,
        mother_external_id = ?,
        address = ?,
        group_id = ?,
        batch_id = ?,
        status = ?
       WHERE id = ? OR mother_code = ?`,
      [...values, Number(id) || current.id, id]
    );

    const [rows] = await pool.query('SELECT * FROM mothers WHERE id = ? OR mother_code = ? LIMIT 1', [Number(id) || current.id, id]);
    res.json({ mother: mapMother(rows[0]) });
  } catch (error) {
    console.error('[Mothers API] PUT /:id error:', error);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM mothers WHERE id = ? OR mother_code = ?', [Number(id) || null, id]);
    res.json({ success: true, deleted: result.affectedRows > 0 });
  } catch (error) {
    console.error('[Mothers API] DELETE /:id error:', error);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
