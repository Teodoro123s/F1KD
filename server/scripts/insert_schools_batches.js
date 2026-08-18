const pool = require('../db');

async function insert() {
  try {
    const groups = [
      { name: 'Poblacion Elementary School', description: 'Primary school - Poblacion' },
      { name: 'Poblacion High School', description: 'High school - Poblacion' },
      { name: 'San Roque Elementary School', description: 'Primary school - San Roque' },
      { name: 'San Roque High School', description: 'High school - San Roque' },
      { name: 'Community Health Center - Poblacion', description: 'Local CHC' }
    ];

    const batches = [
      { batch_code: 'SCHOOL-001', name: 'School Batch 1', description: 'Batch for school outreach 1' },
      { batch_code: 'SCHOOL-002', name: 'School Batch 2', description: 'Batch for school outreach 2' },
      { batch_code: 'COMM-001', name: 'Community Batch 1', description: 'Community batch' }
    ];

    const created = { groups: [], batches: [] };

    for (const g of groups) {
      await pool.query('INSERT INTO groups (group_name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)', [g.name, g.description]);
      const [[row]] = await pool.query('SELECT id FROM groups WHERE group_name = ?', [g.name]);
      created.groups.push({ id: row.id, ...g });
    }

    for (const b of batches) {
      await pool.query('INSERT INTO batches (batch_code, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [b.batch_code, b.name, b.description]);
      const [[row]] = await pool.query('SELECT id FROM batches WHERE batch_code = ?', [b.batch_code]);
      created.batches.push({ id: row.id, ...b });
    }

    console.log('INSERTED', JSON.stringify(created, null, 2));
    await pool.end();
  } catch (err) {
    console.error('ERR', err.message || err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

insert();
