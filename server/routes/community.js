const express = require('express');
const router = express.Router();
const pool = require('../db');

function parseAssignedBatchIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function resolveBatchId(pool, batchIdentifier) {
  const id = Number(batchIdentifier);
  if (!Number.isNaN(id)) {
    return id;
  }

  const [rows] = await pool.query('SELECT id FROM batches WHERE batch_code = ? LIMIT 1', [String(batchIdentifier).trim()]);
  if (!rows.length) return null;
  return rows[0].id;
}

async function nextCode(pool, table, codeColumn, prefix) {
  // Generates the next numeric suffix for codes like SCH-0001, BAT-0001, GRP-0001
  // Use SUBSTRING_INDEX to obtain the numeric portion after the last '-' to be robust.
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(${codeColumn}, '-', -1) AS UNSIGNED)), 0) + 1 AS nextNo FROM ${table}`
  );
  const nextNo = rows[0].nextNo || 1;
  return `${prefix}-${String(nextNo).padStart(4, '0')}`;
}

router.get('/summary', async (req, res) => {
  try {
    console.info('[Community API] Fetching community summary from database (compatible mode)...');

    const [communities] = await pool.query(`
      SELECT
        c.id AS id,
        c.name,
        COALESCE(c.municipality, c.province, '') AS area,
        COUNT(DISTINCT m.batch_id) AS batches,
        COUNT(DISTINCT m.id) AS records
      FROM communities c
      LEFT JOIN mothers m ON m.community = c.name
      GROUP BY c.id, c.name, c.municipality, c.province
      ORDER BY c.id
    `);

    const [batches] = await pool.query(`
      SELECT
        b.id,
        b.batch_code,
        b.name,
        b.description,
        COALESCE(b.community, MAX(m.community), '') AS community,
        COALESCE(b.records, COUNT(m.id)) AS records,
        COALESCE(b.progress, 0) AS progress,
        COALESCE(b.status, 'Active') AS status
      FROM batches b
      LEFT JOIN mothers m ON m.batch_id = b.id
      GROUP BY b.id, b.batch_code, b.name, b.description, b.community, b.records, b.progress, b.status
      ORDER BY b.id
    `);

    const [groupRows] = await pool.query(`
      SELECT
        g.id,
        g.group_name AS name,
        g.description,
        COALESCE(g.community, MAX(m.community), '') AS community,
        COALESCE(g.members_count, COUNT(m.id)) AS members,
        COALESCE(g.leader, '') AS leader,
        COALESCE(g.status, 'Active') AS status
      FROM groups g
      LEFT JOIN mothers m ON m.group_id = g.id
      GROUP BY g.id, g.group_name, g.description, g.community, g.members_count, g.leader, g.status
      ORDER BY g.id
    `);

    const [motherRows] = await pool.query(`
      SELECT
        m.mother_code AS id,
        CONCAT(COALESCE(m.first_name,''), ' ', COALESCE(m.middle_name,''), ' ', COALESCE(m.last_name,'')) AS name,
        b.batch_code AS batchCode,
        g.group_name AS groupName,
        COALESCE(m.progress, 0) AS progress
      FROM mothers m
      LEFT JOIN batches b ON b.id = m.batch_id
      LEFT JOIN groups g ON g.id = m.group_id
      ORDER BY m.id
    `);

    const communitiesData = communities.map((item) => ({
      id: item.id,
      name: item.name,
      area: item.area || '',
      batches: Number(item.batches || 0),
      records: Number(item.records || 0),
    }));

    const batchesData = batches.map((item) => ({
      id: item.batch_code || String(item.id),
      databaseId: item.id,
      code: item.batch_code || String(item.id),
      name: item.name,
      description: item.description,
      community: item.community || '',
      records: Number(item.records || 0),
      progress: 0,
      status: item.status || 'Active',
    }));

    const groupsData = groupRows.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      community: item.community || '',
      leader: item.leader || '',
      members: Number(item.members || 0),
      status: item.status || 'Active',
    }));

    const mothersData = motherRows.map((item) => ({
      id: item.id,
      name: (item.name || '').trim(),
      batchId: item.batchCode || null,
      group: item.groupName || null,
      status: 'Active',
      visits: 0,
      progress: Number(item.progress || 0),
    }));

    const summary = {
      communities: communitiesData,
      batches: batchesData,
      groups: groupsData,
      mothers: mothersData,
    };

    console.info('[Community API] Summary loaded successfully', {
      communities: summary.communities.length,
      batches: summary.batches.length,
      groups: summary.groups.length,
      mothers: summary.mothers.length,
    });

    res.json(summary);
  } catch (error) {
    console.error('[Community API] community summary error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/communities', async (req, res) => {
  try {
    const { name, area } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanArea = String(area || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO communities (name, municipality, province, address) VALUES (?, ?, ?, ?)',
      [cleanName, cleanArea || 'Poblacion', '', '']
    );

    const [rows] = await pool.query(
      'SELECT id, name, COALESCE(municipality, province, "") AS area FROM communities WHERE id = ?',
      [result.insertId]
    );

    const created = rows[0];
    console.info('[Community API] Created community', created);
    res.status(201).json({ community: { id: created.id, name: created.name, area: created.area || '', batches: 0, records: 0 } });
  } catch (error) {
    console.error('[Community API] create community error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/batches', async (req, res) => {
  try {
    const { name, community, records, progress, status } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Batch name is required' });
    }

    const batchCode = await nextCode(pool, 'batches', 'batch_code', 'BAT');
    const [result] = await pool.query(
      'INSERT INTO batches (batch_code, name, description, community, records, progress, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [batchCode, cleanName, `Batch for ${cleanName}`, String(community || '').trim() || null, Number(records) || 0, Number(progress) || 0, status || 'Active']
    );

    const [rows] = await pool.query(
      'SELECT id, batch_code AS code, batch_code AS id, name, description, community, records, progress, status FROM batches WHERE id = ?',
      [result.insertId]
    );

    const created = rows[0];
    console.info('[Community API] Created batch', created);
    res.status(201).json({ batch: { ...created, id: created.code || created.id, code: created.code || created.id } });
  } catch (error) {
    console.error('[Community API] create batch error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/groups', async (req, res) => {
  try {
    const { name, community, leader, members, status } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const cleanLeader = String(leader || '').trim();
    const cleanCommunity = String(community || '').trim();
    const [result] = await pool.query(
      'INSERT INTO groups (group_name, description, community, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanName, '', cleanCommunity || null, cleanLeader || null, Number(members) || 0, status || 'Active']
    );

    const [rows] = await pool.query(
      'SELECT id, group_name AS name, description, community, leader, members_count AS members, status FROM groups WHERE id = ?',
      [result.insertId]
    );

    const created = rows[0];
    console.info('[Community API] Created group', created);
    res.status(201).json({ group: { ...created, assignedBatchIds: [] } });
  } catch (error) {
    console.error('[Community API] create group error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/community/groups - return list of groups/schools
router.get('/groups', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        g.id,
        g.group_name AS name,
        g.description,
        COALESCE(MAX(m.community), '') AS community,
        COUNT(m.id) AS members,
        '' AS leader,
        'Active' AS status
      FROM groups g
      LEFT JOIN mothers m ON m.group_id = g.id
      GROUP BY g.id, g.group_name, g.description
      ORDER BY g.id
    `);
    const groups = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      community: r.community || '',
      leader: r.leader || '',
      members: Number(r.members || 0),
      status: r.status || 'Active',
      assignedBatchIds: [],
    }));
    res.json({ groups });
  } catch (error) {
    console.error('[Community API] GET /groups error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/communities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, area } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanArea = String(area || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    const communityId = Number(id);
    if (Number.isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community id' });
    }

    await pool.query(
      'UPDATE communities SET name = ?, municipality = ?, province = ?, address = ? WHERE id = ?',
      [cleanName, cleanArea || 'Poblacion', '', '', communityId]
    );

    const [rows] = await pool.query(
      'SELECT id, name, COALESCE(municipality, province, "") AS area FROM communities WHERE id = ?',
      [communityId]
    );

    const updated = rows[0];
    res.json({ community: { id: updated.id, name: updated.name, area: updated.area || '', batches: 0, records: 0 } });
  } catch (error) {
    console.error('[Community API] update community error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/communities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const communityId = Number(id);
    if (Number.isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community id' });
    }

    const [result] = await pool.query('DELETE FROM communities WHERE id = ?', [communityId]);
    res.json({ success: true, deleted: result.affectedRows > 0 });
  } catch (error) {
    console.error('[Community API] delete community error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, community, leader, members, status } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const groupId = Number(id);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group id' });
    }

    await pool.query(
      'UPDATE groups SET group_name = ?, community = ?, leader = ?, members_count = ?, status = ? WHERE id = ?',
      [cleanName, String(community || '').trim() || null, String(leader || '').trim() || null, Number(members) || 0, status || 'Active', groupId]
    );

    const [rows] = await pool.query(
      'SELECT id, group_name AS name, description, community, leader, members_count AS members, status FROM groups WHERE id = ?',
      [groupId]
    );

    const updated = rows[0];
    res.json({ group: { ...updated, assignedBatchIds: [] } });
  } catch (error) {
    console.error('[Community API] update group error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = Number(id);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group id' });
    }

    const [result] = await pool.query('DELETE FROM groups WHERE id = ?', [groupId]);
    res.json({ success: true, deleted: result.affectedRows > 0 });
  } catch (error) {
    console.error('[Community API] delete group error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, community, records, progress, status } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Batch name is required' });
    }

    const batchId = await resolveBatchId(pool, id);
    if (!batchId) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    await pool.query(
      'UPDATE batches SET name = ?, community = ?, records = ?, progress = ?, status = ? WHERE id = ?',
      [cleanName, String(community || '').trim() || null, Number(records) || 0, Number(progress) || 0, status || 'Active', batchId]
    );

    const [rows] = await pool.query(
      'SELECT id, batch_code AS code, name, description, community, records, progress, status FROM batches WHERE id = ?',
      [batchId]
    );

    const updated = rows[0];
    res.json({ batch: { ...updated, id: updated.code || updated.id, code: updated.code || updated.id } });
  } catch (error) {
    console.error('[Community API] update batch error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const batchId = await resolveBatchId(pool, id);
    if (!batchId) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const [result] = await pool.query('DELETE FROM batches WHERE id = ?', [batchId]);
    res.json({ success: true, deleted: result.affectedRows > 0 });
  } catch (error) {
    console.error('[Community API] delete batch error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/community/batches - return list of batches
router.get('/batches', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        b.id,
        b.batch_code AS code,
        b.name,
        b.description,
        COALESCE(b.community, MAX(m.community), '') AS community,
        COALESCE(b.records, COUNT(m.id)) AS records,
        COALESCE(b.progress, 0) AS progress,
        COALESCE(b.status, 'Active') AS status
      FROM batches b
      LEFT JOIN mothers m ON m.batch_id = b.id
      GROUP BY b.id, b.batch_code, b.name, b.description, b.community, b.records, b.progress, b.status
      ORDER BY b.id
    `);
    const batches = rows.map((r) => ({
      id: r.code || String(r.id),
      code: r.code || String(r.id),
      name: r.name,
      description: r.description,
      community: r.community || '',
      records: Number(r.records || 0),
      progress: 0,
      status: r.status || 'Active',
    }));
    res.json({ batches });
  } catch (error) {
    console.error('[Community API] GET /batches error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
