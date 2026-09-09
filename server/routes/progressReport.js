const express = require('express');
const pool = require('../db');

const router = express.Router();

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '' || value === 'all') return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
};

const parseParams = (query) => ({
  schoolId: numberOrNull(query.schoolId),
  groupId: numberOrNull(query.groupId),
  batchId: numberOrNull(query.batchId),
  motherId: numberOrNull(query.motherId),
  granularity: query.granularity === 'mother' ? 'mother' : 'child',
  search: String(query.search || '').trim(),
  page: Math.max(1, Number(query.page) || 1),
  perPage: Math.min(100, Math.max(1, Number(query.perPage) || 50)),
  exportAll: String(query.export || '') === '1',
});

const hierarchyWhere = (params, aliases = { mother: 'm', child: 'c' }) => {
  const conditions = [];
  const values = [];
  const owner = aliases.child || aliases.mother;
  if (params.schoolId) { conditions.push(`${owner}.community_id = ?`); values.push(params.schoolId); }
  if (params.groupId) { conditions.push(`${owner}.group_id = ?`); values.push(params.groupId); }
  if (params.batchId) { conditions.push(`${owner}.batch_id = ?`); values.push(params.batchId); }
  if (params.motherId) { conditions.push(`${aliases.mother}.id = ?`); values.push(params.motherId); }
  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(`CONCAT_WS(' ', ${aliases.child}.first_name, ${aliases.child}.middle_name, ${aliases.child}.last_name, ${aliases.mother}.first_name, ${aliases.mother}.last_name, ${aliases.child}.child_code, ${aliases.mother}.mother_code) LIKE ?`);
    values.push(term);
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
};

router.get('/options', async (req, res) => {
  try {
    const [schools] = await pool.query('SELECT id, name FROM communities ORDER BY name');
    const [groups] = await pool.query('SELECT id, name, community_id AS schoolId FROM groups ORDER BY name');
    const [batches] = await pool.query('SELECT id, name, batch_code AS code, community_id AS schoolId FROM batches ORDER BY name');
    const [mothers] = await pool.query(`
      SELECT m.id, m.mother_code AS code,
        TRIM(CONCAT_WS(' ', m.first_name, m.middle_name, m.last_name, m.suffix)) AS name,
        m.community_id AS schoolId, m.group_id AS groupId, m.batch_id AS batchId
      FROM mothers m ORDER BY name
    `);
    res.json({ schools, groups, batches, mothers });
  } catch (error) {
    console.error('[Progress Report] options error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const params = parseParams(req.query);
    const filters = hierarchyWhere(params);
    const progressExpression = `ROUND(COUNT(DISTINCT cc.id) * 100 / 48, 0)`;
    const motherProgressExpression = `ROUND(COUNT(DISTINCT cc.id) * 100 / NULLIF(COUNT(DISTINCT c.id) * 48, 0), 0)`;
    const baseFrom = `
      FROM children c
      INNER JOIN mothers m ON m.id = c.mother_id
      LEFT JOIN communities school ON school.id = c.community_id
      LEFT JOIN groups g ON g.id = c.group_id
      LEFT JOIN batches b ON b.id = c.batch_id
      LEFT JOIN child_checkups cc ON cc.child_id = c.id AND cc.week_number IS NOT NULL
      ${filters.sql}`;

    const groupExpression = params.granularity === 'mother'
      ? 'm.id, m.mother_code, m.first_name, m.middle_name, m.last_name, m.suffix, school.name, g.name, b.name'
      : 'c.id, c.child_code, c.first_name, c.middle_name, c.last_name, m.id, m.mother_code, m.first_name, m.last_name, school.name, g.name, b.name';
    const nameExpression = params.granularity === 'mother'
      ? `TRIM(CONCAT_WS(' ', m.first_name, m.middle_name, m.last_name, m.suffix))`
      : `TRIM(CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name, c.suffix))`;
    const childNameExpression = params.granularity === 'mother' ? 'NULL' : `TRIM(CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name, c.suffix))`;
    const totalExpression = params.granularity === 'mother' ? 'COUNT(DISTINCT c.id) * 48' : '48';
    const ageExpression = params.granularity === 'mother'
      ? 'TIMESTAMPDIFF(YEAR, m.dob, CURDATE())'
      : 'ROUND(TIMESTAMPDIFF(MONTH, c.birth_date, CURDATE()) / 12, 1)';
    const genderExpression = params.granularity === 'mother' ? 'NULL' : 'c.gender';
    const statusExpression = params.granularity === 'mother' ? 'm.status' : 'c.health_status';
    const dobExpression = params.granularity === 'mother' ? 'm.dob' : 'c.birth_date';
    const groupDetails = params.granularity === 'mother'
      ? 'm.dob, m.status, m.contact_number, m.is_high_risk, m.program_type'
      : 'c.birth_date, c.gender, c.health_status, m.contact_number, m.is_high_risk, m.program_type';
    const query = `
      SELECT
        school.id AS school_id, school.name AS school_name,
        g.id AS group_id, g.name AS group_name,
        b.id AS batch_id, b.name AS batch_name,
        m.id AS mother_id, m.mother_code,
        ${nameExpression} AS mother_name,
        ${childNameExpression} AS child_name,
        ${ageExpression} AS age,
        ${genderExpression} AS gender,
        ${statusExpression} AS status,
        ${dobExpression} AS date_of_birth,
        m.contact_number AS contact_number,
        CASE WHEN m.is_high_risk = 1 THEN 'High risk' ELSE 'Normal risk' END AS risk,
        m.program_type AS program,
        MAX(cc.visit_date) AS last_activity_date,
        MIN(cc.next_checkup_date) AS next_checkup_date,
        ${params.granularity === 'mother' ? 'NULL' : 'c.delivery_type'} AS delivery_type,
        COUNT(DISTINCT cc.id) AS activities_completed,
        ${totalExpression} AS total_activities,
        ${params.granularity === 'mother' ? motherProgressExpression : progressExpression} AS progress
      ${baseFrom}
      GROUP BY ${groupExpression}, ${groupDetails}
      ORDER BY school.name, g.name, b.name, mother_name, child_name`;
    const [rows] = await pool.query(query, filters.values);
    const normalizedRows = rows.map((row) => ({
      schoolId: row.school_id,
      school: row.school_name || 'Unassigned school',
      groupId: row.group_id,
      group: row.group_name || 'Unassigned group',
      batchId: row.batch_id,
      batch: row.batch_name || 'Unassigned batch',
      motherId: row.mother_id,
      mother: row.mother_name || row.mother_code || 'Unnamed mother',
      child: row.child_name || (params.granularity === 'mother' ? row.mother_name : 'Unnamed child'),
      age: row.age === null || row.age === undefined ? '' : Number(row.age),
      gender: row.gender || '',
      status: row.status || '',
      dateOfBirth: row.date_of_birth || '',
      contact: row.contact_number || '',
      risk: row.risk || '',
      program: row.program || '',
      lastActivityDate: row.last_activity_date || '',
      nextCheckupDate: row.next_checkup_date || '',
      deliveryType: row.delivery_type || '',
      activitiesCompleted: Number(row.activities_completed || 0),
      totalActivities: Number(row.total_activities || 0),
      progress: Number(row.progress || 0),
    }));
    const total = normalizedRows.length;
    const page = params.exportAll ? 1 : params.page;
    const perPage = params.exportAll ? Math.max(total, 1) : params.perPage;
    const pagedRows = normalizedRows.slice((page - 1) * perPage, page * perPage);
    const averageProgress = total ? Math.round(normalizedRows.reduce((sum, row) => sum + row.progress, 0) / total) : 0;
    const groupCount = new Set(normalizedRows.map((row) => row.groupId).filter(Boolean)).size;
    const batchCount = new Set(normalizedRows.map((row) => row.batchId).filter(Boolean)).size;
    res.json({
      rows: pagedRows,
      pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
      summary: { total, averageProgress, groupCount, batchCount },
      breadcrumb: [params.schoolId ? normalizedRows[0]?.school : 'All Schools', params.groupId ? normalizedRows[0]?.group : 'All Groups', params.batchId ? normalizedRows[0]?.batch : 'All Batches'].filter(Boolean),
    });
  } catch (error) {
    console.error('[Progress Report] report error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;