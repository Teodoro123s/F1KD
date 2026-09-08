const express = require('express');
const router = express.Router();
const pool = require('../db');

function cleanProgram(body = {}) {
  const name = String(body.name || '').trim();
  const provider = String(body.provider || '').trim();
  if (!name || !provider) return null;
  return {
    name,
    type: String(body.type || 'Other').trim(),
    provider,
    description: String(body.description || '').trim() || null,
    beneficiary_type: String(body.beneficiaryType || body.beneficiary_type || 'Mother and Child').trim(),
  };
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : null;
}

async function getProgram(id) {
  const [rows] = await pool.query('SELECT * FROM programs WHERE id = ?', [id]);
  if (!rows.length) return null;
  const [clusters] = await pool.query('SELECT id, scope_type AS type, scope_name AS name, beneficiaries, received FROM program_clusters WHERE program_id = ? ORDER BY id', [id]);
  const target = clusters.reduce((total, cluster) => total + Number(cluster.beneficiaries || 0), 0);
  const received = clusters.reduce((total, cluster) => total + Number(cluster.received || 0), 0);
  const schoolCluster = clusters.find((cluster) => cluster.type === 'School');
  const batchCluster = clusters.find((cluster) => cluster.type === 'Batch');
  return {
    ...rows[0],
    beneficiaryType: rows[0].beneficiary_type,
    target,
    received,
    community: schoolCluster?.name || '',
    batch: batchCluster?.name || '',
    clusters,
  };
}

router.get('/', async (req, res) => {
  try {
    const scopeClause = req.schoolId
      ? `WHERE EXISTS (
          SELECT 1
          FROM program_clusters scoped_cluster
          INNER JOIN communities scoped_school ON scoped_school.name = scoped_cluster.scope_name
          WHERE scoped_cluster.program_id = p.id
            AND scoped_cluster.scope_type = 'School'
            AND scoped_school.id = ?
        )`
      : '';
    const [rows] = await pool.query(`SELECT p.* FROM programs p ${scopeClause} ORDER BY p.id DESC`, req.schoolId ? [req.schoolId] : []);
    const programs = await Promise.all(rows.map((row) => getProgram(row.id)));
    res.json({ programs });
  } catch (error) {
    console.error('[Programs API] list error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/', async (req, res) => {
  const program = cleanProgram(req.body);
  if (!program) return res.status(400).json({ error: 'Program name and provider are required' });
  try {
    const [result] = await pool.query('INSERT INTO programs (name, type, provider, description, beneficiary_type) VALUES (?, ?, ?, ?, ?)', Object.values(program));
    res.status(201).json({ program: await getProgram(result.insertId) });
  } catch (error) {
    console.error('[Programs API] create error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/:id', async (req, res) => {
  const program = cleanProgram(req.body);
  if (!program) return res.status(400).json({ error: 'Program name and provider are required' });
  try {
    const [result] = await pool.query('UPDATE programs SET name = ?, type = ?, provider = ?, description = ?, beneficiary_type = ? WHERE id = ?', [...Object.values(program), req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Program not found' });
    res.json({ program: await getProgram(req.params.id) });
  } catch (error) {
    console.error('[Programs API] update error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:id/end', async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE programs SET status = 'Ended', ended = CURRENT_DATE WHERE id = ?",
      [req.params.id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Program not found' });
    res.json({ program: await getProgram(req.params.id) });
  } catch (error) {
    console.error('[Programs API] end error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM programs WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Program not found' });
    res.status(204).end();
  } catch (error) {
    console.error('[Programs API] delete error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/clusters', async (req, res) => {
  const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes : [];
  if (!scopes.length) return res.status(400).json({ error: 'At least one scope is required' });
  try {
    for (const scope of scopes) {
      const type = String(scope.type || '').trim();
      const name = String(scope.name || '').trim();
      if (!type || !name) continue;
      await pool.query('INSERT IGNORE INTO program_clusters (program_id, scope_type, scope_name, beneficiaries) VALUES (?, ?, ?, ?)', [req.params.id, type, name, Number(scope.beneficiaries) || 0]);
    }
    res.status(201).json({ program: await getProgram(req.params.id) });
  } catch (error) {
    console.error('[Programs API] cluster error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:programId/clusters/:clusterId/complete', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE program_clusters SET received = beneficiaries WHERE id = ? AND program_id = ?',
      [req.params.clusterId, req.params.programId],
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Cluster not found' });
    res.json({ program: await getProgram(req.params.programId) });
  } catch (error) {
    console.error('[Programs API] complete cluster error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:programId/clusters/complete', async (req, res) => {
  const type = String(req.body?.type || '').trim();
  const name = String(req.body?.name || '').trim();
  const beneficiaries = Number(req.body?.beneficiaries || 0);
  if (!type || !name) return res.status(400).json({ error: 'Cluster type and name are required' });
  try {
    const [result] = await pool.query(
      'UPDATE program_clusters SET received = beneficiaries WHERE program_id = ? AND scope_type = ? AND scope_name = ?',
      [req.params.programId, type, name],
    );
    if (!result.affectedRows) {
      await pool.query(
        'INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received) VALUES (?, ?, ?, ?, ?)',
        [req.params.programId, type, name, beneficiaries, beneficiaries],
      );
    }
    res.json({ program: await getProgram(req.params.programId) });
  } catch (error) {
    console.error('[Programs API] complete named cluster error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:programId/monitoring', async (req, res) => {
  const date = validDate(req.query.date) || new Date().toISOString().slice(0, 10);
  try {
    const [logs] = await pool.query(
      `SELECT beneficiary_id, beneficiary_type, monitored, DATE_FORMAT(monitored_date, '%Y-%m-%d') AS monitored_date, notes
       FROM monitoring_logs
       WHERE program_id = ? AND monitored_date = ?
       ORDER BY id`,
      [req.params.programId, date],
    );
    res.json({ date, logs });
  } catch (error) {
    console.error('[Programs API] monitoring status error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:programId/monitoring', async (req, res) => {
  const beneficiaryId = String(req.body?.beneficiaryId || '').trim();
  const beneficiaryType = String(req.body?.beneficiaryType || '').trim().toLowerCase();
  const date = validDate(req.body?.date) || new Date().toISOString().slice(0, 10);
  const monitored = Boolean(req.body?.monitored);
  if (!beneficiaryId || !['mother', 'child'].includes(beneficiaryType)) {
    return res.status(400).json({ error: 'Beneficiary ID and type are required' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO monitoring_logs
        (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), monitored_by = VALUES(monitored_by), updated_at = CURRENT_TIMESTAMP`,
      [beneficiaryId, beneficiaryType, req.params.programId, monitored, date, req.user?.id || null],
    );
    res.json({ success: true, date, monitored, id: result.insertId || null });
  } catch (error) {
    console.error('[Programs API] monitoring update error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:programId/monitoring/report/:beneficiaryType/:beneficiaryId', async (req, res) => {
  const beneficiaryType = String(req.params.beneficiaryType || '').toLowerCase();
  if (!['mother', 'child'].includes(beneficiaryType)) return res.status(400).json({ error: 'Invalid beneficiary type' });
  try {
    const [logs] = await pool.query(
      `SELECT DATE_FORMAT(ml.monitored_date, '%Y-%m-%d') AS date, ml.monitored, ml.notes, p.name AS program_name,
              COALESCE(CONCAT(u.first_name, ' ', u.last_name), u.full_name, u.username) AS monitored_by_name
       FROM monitoring_logs ml
       INNER JOIN programs p ON p.id = ml.program_id
       LEFT JOIN users u ON u.id = ml.monitored_by
       WHERE ml.program_id = ? AND ml.beneficiary_id = ? AND ml.beneficiary_type = ?
       ORDER BY ml.monitored_date DESC`,
      [req.params.programId, req.params.beneficiaryId, beneficiaryType],
    );
    res.json({ report: logs });
  } catch (error) {
    console.error('[Programs API] monitoring report error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;