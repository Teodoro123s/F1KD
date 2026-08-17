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
    console.info('[Community API] Fetching community summary from database...');

    const [communities] = await pool.query(`
      SELECT
        c.community_code AS id,
        c.name,
        c.area,
        COUNT(DISTINCT b.id) AS batches,
        COUNT(DISTINCT m.id) AS records
      FROM communities c
      LEFT JOIN batches b ON b.community_id = c.id
      LEFT JOIN mothers m ON m.community_id = c.id
      GROUP BY c.id, c.community_code, c.name, c.area
      ORDER BY c.id
    `);

    const [batches] = await pool.query(`
      SELECT
        b.batch_code AS id,
        b.name,
        c.name AS community,
        b.records,
        b.progress,
        b.status
      FROM batches b
      JOIN communities c ON c.id = b.community_id
      ORDER BY b.id
    `);

    const [groupRows] = await pool.query(`
      SELECT
        g.group_code AS id,
        g.name,
        c.name AS community,
        g.leader,
        g.members_count AS members,
        g.status,
        GROUP_CONCAT(DISTINCT b.batch_code ORDER BY b.batch_code SEPARATOR ',') AS assignedBatchIds,
        COUNT(DISTINCT b.id) AS batches
      FROM groups g
      JOIN communities c ON c.id = g.community_id
      LEFT JOIN group_batch gb ON gb.group_id = g.id
      LEFT JOIN batches b ON b.id = gb.batch_id
      GROUP BY g.id, g.group_code, g.name, c.name, g.leader, g.members_count, g.status
      ORDER BY g.id
    `);

    const [motherRows] = await pool.query(`
      SELECT
        m.mother_code AS id,
        CONCAT(m.first_name, ' ', IFNULL(m.middle_name, ''), ' ', m.last_name) AS name,
        b.batch_code AS batchId,
        g.name AS groupName,
        m.status,
        m.visits
      FROM mothers m
      LEFT JOIN batches b ON b.id = m.batch_id
      LEFT JOIN groups g ON g.id = m.group_id
      ORDER BY m.id
    `);

    const communitiesData = communities.map((item) => ({
      id: item.id,
      name: item.name,
      area: item.area,
      batches: Number(item.batches || 0),
      records: Number(item.records || 0),
    }));

    const batchesData = batches.map((item) => ({
      id: item.id,
      name: item.name,
      community: item.community,
      records: Number(item.records || 0),
      progress: Number(item.progress || 0),
      status: item.status,
    }));

    const groupsData = groupRows.map((item) => ({
      id: item.id,
      name: item.name,
      community: item.community,
      assignedBatchIds: parseAssignedBatchIds(item.assignedBatchIds),
      leader: item.leader,
      members: Number(item.members || 0),
      status: item.status,
      batches: Number(item.batches || 0),
    }));

    const mothersData = motherRows.map((item) => ({
      id: item.id,
      name: item.name,
      batchId: item.batchId || null,
      group: item.groupName || null,
      status: item.status || 'Active',
      visits: Number(item.visits || 0),
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
    console.error('[Community API] community summary error:', error);
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

    const communityCode = await nextCode(pool, 'communities', 'community_code', 'SCH');
    const [result] = await pool.query(
      'INSERT INTO communities (community_code, name, area) VALUES (?, ?, ?)',
      [communityCode, cleanName, cleanArea || 'Poblacion']
    );

    const [rows] = await pool.query(
      'SELECT community_code AS id, name, area FROM communities WHERE id = ?',
      [result.insertId]
    );

    const created = rows[0];
    console.info('[Community API] Created community', created);
    res.status(201).json({ community: { ...created, batches: 0, records: 0 } });
  } catch (error) {
    console.error('[Community API] create community error:', error);
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

    const [communityRows] = await pool.query(
      'SELECT id FROM communities WHERE name = ? LIMIT 1',
      [String(community || '').trim() || 'Poblacion']
    );

    if (!communityRows.length) {
      return res.status(400).json({ error: 'Community not found' });
    }

    const batchCode = await nextCode(pool, 'batches', 'batch_code', 'BAT');
    const [result] = await pool.query(
      'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
      [batchCode, communityRows[0].id, cleanName, Number(records) || 0, Number(progress) || 0, status || 'Active']
    );

    const [rows] = await pool.query(
      'SELECT b.batch_code AS id, b.name, c.name AS community, b.records, b.progress, b.status FROM batches b JOIN communities c ON c.id = b.community_id WHERE b.id = ?',
      [result.insertId]
    );

    const created = rows[0];
    console.info('[Community API] Created batch', created);
    res.status(201).json({ batch: created });
  } catch (error) {
    console.error('[Community API] create batch error:', error);
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

    const [communityRows] = await pool.query(
      'SELECT id FROM communities WHERE name = ? LIMIT 1',
      [String(community || '').trim()]
    );

    if (!communityRows.length) {
      return res.status(400).json({ error: 'Community not found' });
    }

    const groupCode = await nextCode(pool, 'groups', 'group_code', 'GRP');
    const [result] = await pool.query(
      'INSERT INTO groups (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
      [groupCode, communityRows[0].id, cleanName, String(leader || '').trim(), Number(members) || 0, status || 'Active']
    );

    const [rows] = await pool.query(
      'SELECT g.group_code AS id, g.name, c.name AS community, g.leader, g.members_count AS members, g.status, 0 AS batches FROM groups g JOIN communities c ON c.id = g.community_id WHERE g.id = ?',
      [result.insertId]
    );

    const created = rows[0];
    console.info('[Community API] Created group', created);
    res.status(201).json({ group: { ...created, assignedBatchIds: [] } });
  } catch (error) {
    console.error('[Community API] create group error:', error);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
