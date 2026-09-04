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

async function getProgram(id) {
  const [rows] = await pool.query('SELECT * FROM programs WHERE id = ?', [id]);
  if (!rows.length) return null;
  const [clusters] = await pool.query('SELECT id, scope_type AS type, scope_name AS name, beneficiaries, received FROM program_clusters WHERE program_id = ? ORDER BY id', [id]);
  const target = clusters.reduce((total, cluster) => total + Number(cluster.beneficiaries || 0), 0);
  const received = clusters.reduce((total, cluster) => total + Number(cluster.received || 0), 0);
  return { ...rows[0], beneficiaryType: rows[0].beneficiary_type, target, received, clusters };
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM programs ORDER BY id DESC');
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

module.exports = router;