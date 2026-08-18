const pool = require('../db');

async function insert() {
  try {
    const created = { communities: [], groups: [], batches: [], mothers: [], children: [] };

    // Communities (table uses name, municipality, province, address)
    await pool.query(`
      DELETE c1
      FROM communities c1
      JOIN communities c2
        ON c1.name = c2.name
       AND c1.id > c2.id
    `);

    const communities = [
      { name: 'Poblacion', municipality: 'Poblacion Town', province: 'Province A', address: 'Brgy. Poblacion' },
      { name: 'San Roque', municipality: 'San Roque Town', province: 'Province A', address: 'Brgy. San Roque' }
    ];

    for (const c of communities) {
      await pool.query(
        `INSERT INTO communities (name, municipality, province, address) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE municipality=VALUES(municipality), province=VALUES(province)`,
        [c.name, c.municipality, c.province, c.address]
      );
      const [[row]] = await pool.query('SELECT id FROM communities WHERE name = ?', [c.name]);
      created.communities.push({ id: row.id, ...c });
    }

    // Groups (table uses group_name)
    const groups = [
      { group_name: 'Poblacion School', description: 'School-based volunteers' },
      { group_name: 'Poblacion Health Volunteers', description: 'Community health volunteers' },
      { group_name: 'San Roque Mothers', description: 'Mothers support group' }
    ];

    for (const g of groups) {
      await pool.query(
        `INSERT INTO groups (group_name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description)`,
        [g.group_name, g.description]
      );
      const [[row]] = await pool.query('SELECT id FROM groups WHERE group_name = ?', [g.group_name]);
      created.groups.push({ id: row.id, ...g });
    }

    // Batches (batch_code unique)
    const batches = [
      { batch_code: 'BATCH-001', name: 'Batch A', description: 'Initial import batch' },
      { batch_code: 'BATCH-002', name: 'Batch B', description: 'Secondary batch' }
    ];

    for (const b of batches) {
      await pool.query(
        `INSERT INTO batches (batch_code, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [b.batch_code, b.name, b.description]
      );
      const [[row]] = await pool.query('SELECT id FROM batches WHERE batch_code = ?', [b.batch_code]);
      created.batches.push({ id: row.id, ...b });
    }

    // Mothers (table fields observed: mother_code, first_name, middle_name, last_name, community (string), mother_external_id, ...)
    const mothers = [
      { mother_code: 'MTH-0001', community_name: 'Poblacion', first_name: 'Maria', middle_name: 'S', last_name: 'Cruz', mother_external_id: 'MTHID001', dob: '1990-05-12', lmp_date: '2026-06-01', edd_date: '2027-03-08', contact_number: '09171234567' },
      { mother_code: 'MTH-0002', community_name: 'Poblacion', first_name: 'Ana', middle_name: 'L', last_name: 'Gonzales', mother_external_id: 'MTHID002', dob: '1995-11-02', lmp_date: '2026-07-15', edd_date: '2027-04-22', contact_number: '09179876543' },
      { mother_code: 'MTH-0003', community_name: 'San Roque', first_name: 'Luz', middle_name: null, last_name: 'Santos', mother_external_id: 'MTHID003', dob: '1988-03-30', contact_number: '09170001111' }
    ];

    for (const m of mothers) {
      await pool.query(
        `INSERT INTO mothers (mother_code, first_name, middle_name, last_name, mother_external_id, dob, lmp_date, edd_date, contact_number, community) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name=VALUES(first_name)`,
        [m.mother_code, m.first_name, m.middle_name, m.last_name, m.mother_external_id, m.dob, m.lmp_date, m.edd_date, m.contact_number, m.community_name]
      );
      const [[row]] = await pool.query('SELECT id FROM mothers WHERE mother_code = ?', [m.mother_code]);
      created.mothers.push({ id: row.id, ...m });
    }

    // Children (children table has child_code, mother_id, community_id, batch_id, first_name, last_name, etc.)
    const children = [
      { child_code: 'CHD-0001', mother_code: 'MTH-0001', community_name: 'Poblacion', batch_code: 'BATCH-001', first_name: 'Juan', last_name: 'Cruz', birth_date: '2026-07-15', birth_weight: 3.2, gender: 'Male' },
      { child_code: 'CHD-0002', mother_code: 'MTH-0001', community_name: 'Poblacion', batch_code: 'BATCH-001', first_name: 'Maria', last_name: 'Cruz', birth_date: '2024-02-02', birth_weight: 2.8, gender: 'Female' },
      { child_code: 'CHD-0003', mother_code: 'MTH-0003', community_name: 'San Roque', batch_code: 'BATCH-002', first_name: 'Leo', last_name: 'Santos', birth_date: '2025-10-10', birth_weight: 3.0, gender: 'Male' }
    ];

    for (const c of children) {
      const [[motherRow]] = await pool.query('SELECT id FROM mothers WHERE mother_code = ?', [c.mother_code]);
      const [[commRow]] = await pool.query('SELECT id FROM communities WHERE name = ?', [c.community_name]);
      const [[batchRow]] = await pool.query('SELECT id FROM batches WHERE batch_code = ?', [c.batch_code]);
      if (!motherRow) throw new Error(`Mother not found for code ${c.mother_code}`);
      const motherId = motherRow.id;
      const communityId = commRow ? commRow.id : null;
      const batchId = batchRow ? batchRow.id : null;

      await pool.query(
        `INSERT INTO children (child_code, mother_id, community_id, batch_id, first_name, middle_name, last_name, birth_date, birth_weight, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name=VALUES(first_name)`,
        [c.child_code, motherId, communityId, batchId, c.first_name, null, c.last_name, c.birth_date, c.birth_weight, c.gender]
      );
      const [[row]] = await pool.query('SELECT id FROM children WHERE child_code = ?', [c.child_code]);
      created.children.push({ id: row.id, ...c });
    }

    console.log('SAMPLE_INSERTED', JSON.stringify(created, null, 2));
    await pool.end();
  } catch (err) {
    console.error('INSERT_ERR', err.message || err);
    try { await pool.end(); } catch(e) {}
    process.exit(1);
  }
}

insert();
