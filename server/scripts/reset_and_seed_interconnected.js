const pool = require('../db');

async function exists(col, table) {
  const [r] = await pool.query('SHOW COLUMNS FROM `'+table+'` LIKE ?', [col]);
  return r.length > 0;
}

async function run() {
  try {
    console.log('Starting reset and seed interconnected data');

    // 1) Delete previously seeded mothers/children/batches/groups by known codes/names
    const groupNames = [
      'Poblacion School','Poblacion Health Volunteers','San Roque Mothers',
      'Poblacion Elementary School','Poblacion High School','San Roque Elementary School','San Roque High School','Community Health Center - Poblacion'
    ];
    const batchCodes = ['BATCH-001','BATCH-002','SCHOOL-001','SCHOOL-002','COMM-001'];

    console.log('Deleting children with child_code LIKE CHD-%');
    await pool.query("DELETE FROM children WHERE child_code LIKE 'CHD-%'");

    console.log('Deleting mothers with mother_code LIKE MTH-%');
    await pool.query("DELETE FROM mothers WHERE mother_code LIKE 'MTH-%'");

    console.log('Deleting batches by batch_code');
    for (const b of batchCodes) {
      await pool.query('DELETE FROM batches WHERE batch_code = ?', [b]);
    }

    console.log('Deleting groups by group_name');
    for (const g of groupNames) {
      await pool.query('DELETE FROM groups WHERE group_name = ?', [g]);
    }

    // Also clear clinical tables we inserted earlier tied to those mothers/children (safe by checking existence)
    const clinical = ['mother_ob_history','mother_vaccinations','mother_vaccines','mother_medical_conditions','child_vaccinations','child_vaccines','child_medical_conditions','child_checkups'];
    for (const t of clinical) {
      const [exists] = await pool.query("SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [t]);
      if (exists[0].cnt) {
        // delete rows where related id references the seeded mothers/children by code
        if (t.startsWith('mother_')) {
          await pool.query(`DELETE ${t} FROM ${t} JOIN mothers ON ${t}.mother_id = mothers.id WHERE mothers.mother_code LIKE 'MTH-%'`);
        } else if (t.startsWith('child_')) {
          await pool.query(`DELETE ${t} FROM ${t} JOIN children ON ${t}.child_id = children.id WHERE children.child_code LIKE 'CHD-%'`);
        }
      }
    }

    // 2) Ensure mothers table has group_id and batch_id columns and FKs
    const hasGroupId = await exists('group_id','mothers');
    if (!hasGroupId) {
      console.log('Adding group_id and batch_id columns to mothers');
      await pool.query('ALTER TABLE mothers ADD COLUMN group_id INT NULL, ADD COLUMN batch_id INT NULL');
      // add indexes
      await pool.query('ALTER TABLE mothers ADD INDEX idx_mothers_group (group_id), ADD INDEX idx_mothers_batch (batch_id)');
      // add FK constraints if parent tables exist
      const [gExists] = await pool.query("SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups'");
      const [bExists] = await pool.query("SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batches'");
      if (gExists[0].cnt) {
        try { await pool.query('ALTER TABLE mothers ADD CONSTRAINT fk_mothers_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL'); } catch(e){ console.log('FK mothers->groups add failed (maybe exists):', e.message); }
      }
      if (bExists[0].cnt) {
        try { await pool.query('ALTER TABLE mothers ADD CONSTRAINT fk_mothers_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL'); } catch(e){ console.log('FK mothers->batches add failed (maybe exists):', e.message); }
      }
    } else {
      console.log('mothers.group_id already exists');
    }

    // 3) Insert interconnected data: communities (if missing), groups, batches
    // Insert communities if missing
    const communityNames = ['Poblacion','San Roque'];
    for (const name of communityNames) {
      await pool.query('INSERT IGNORE INTO communities (name, municipality, province, address) VALUES (?, ?, ?, ?)', [name, name + ' Town', 'Province A', 'Brgy. ' + name]);
    }

    // Create groups (schools)
    const schools = [
      { group_name: 'Poblacion Elementary School', description: 'Primary school - Poblacion', community: 'Poblacion' },
      { group_name: 'Poblacion High School', description: 'High school - Poblacion', community: 'Poblacion' },
      { group_name: 'San Roque Elementary School', description: 'Primary school - San Roque', community: 'San Roque' },
      { group_name: 'San Roque High School', description: 'High school - San Roque', community: 'San Roque' }
    ];
    for (const s of schools) {
      await pool.query('INSERT INTO groups (group_name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)', [s.group_name, s.description]);
    }

    // Create batches
    const schoolBatches = [
      { batch_code: 'SCHOOL-001', name: 'School Outreach 1' },
      { batch_code: 'SCHOOL-002', name: 'School Outreach 2' }
    ];
    for (const b of schoolBatches) {
      await pool.query('INSERT INTO batches (batch_code, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [b.batch_code, b.name, 'Batch for ' + b.batch_code]);
    }

    // 4) Insert mothers associated to specific group and batch
    // Map mothers to schools
    const mothers = [
      { mother_code: 'MTH-1001', first_name: 'Rosa', middle_name: 'M', last_name: 'Lopez', community: 'Poblacion', group_name: 'Poblacion Elementary School', batch_code: 'SCHOOL-001', dob: '1992-04-12', contact_number: '09171239999' },
      { mother_code: 'MTH-1002', first_name: 'Elena', middle_name: 'A', last_name: 'Reyes', community: 'Poblacion', group_name: 'Poblacion High School', batch_code: 'SCHOOL-001', dob: '1990-06-23', contact_number: '09170002222' },
      { mother_code: 'MTH-1003', first_name: 'Marta', middle_name: null, last_name: 'Perez', community: 'San Roque', group_name: 'San Roque Elementary School', batch_code: 'SCHOOL-002', dob: '1988-10-05', contact_number: '09173334444' }
    ];

    for (const m of mothers) {
      // find group id
      const [[grow]] = await pool.query('SELECT id FROM groups WHERE group_name = ?', [m.group_name]);
      const [[brow]] = await pool.query('SELECT id FROM batches WHERE batch_code = ?', [m.batch_code]);
      const groupId = grow ? grow.id : null;
      const batchId = brow ? brow.id : null;
      await pool.query(`INSERT INTO mothers (mother_code, first_name, middle_name, last_name, mother_external_id, dob, contact_number, community, group_id, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name=VALUES(first_name), group_id=VALUES(group_id), batch_id=VALUES(batch_id)`,
        [m.mother_code, m.first_name, m.middle_name, m.last_name, m.mother_code+'-EXT', m.dob, m.contact_number, m.community, groupId, batchId]);
    }

    // 5) Insert children for those mothers and ensure connections
    const children = [
      { child_code: 'CHD-1001', mother_code: 'MTH-1001', first_name: 'Kiko', last_name: 'Lopez', birth_date: '2024-05-10', birth_weight: 3.1 },
      { child_code: 'CHD-1002', mother_code: 'MTH-1001', first_name: 'Lina', last_name: 'Lopez', birth_date: '2022-08-02', birth_weight: 2.9 },
      { child_code: 'CHD-1003', mother_code: 'MTH-1002', first_name: 'Noel', last_name: 'Reyes', birth_date: '2023-09-11', birth_weight: 3.0 }
    ];

    for (const c of children) {
      const [[mrow]] = await pool.query('SELECT id, group_id, batch_id FROM mothers WHERE mother_code = ?', [c.mother_code]);
      if (!mrow || !mrow.id) throw new Error('Mother not found for ' + c.mother_code);
      const communityIdRow = await pool.query('SELECT id FROM communities WHERE name = ?', [ (await pool.query('SELECT community FROM mothers WHERE mother_code = ?', [c.mother_code]))[0][0].community ]);
      const communityId = communityIdRow && communityIdRow[0] && communityIdRow[0][0] ? communityIdRow[0][0].id : null;
      const batchId = mrow.batch_id || null;
      await pool.query('INSERT INTO children (child_code, mother_id, community_id, batch_id, first_name, middle_name, last_name, birth_date, birth_weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name=VALUES(first_name)',
        [c.child_code, mrow.id, communityId, batchId, c.first_name, null, c.last_name, c.birth_date, c.birth_weight]);
    }

    console.log('Seeding complete. Fetching interconnected sample rows...');

    // Fetch join view: mothers with group_name and batch_code and child's count
    const [rows] = await pool.query(`SELECT m.id AS mother_id, m.mother_code, m.first_name, m.last_name, m.community, g.group_name, b.batch_code, b.name AS batch_name, COUNT(ch.id) AS children_count
      FROM mothers m
      LEFT JOIN groups g ON m.group_id = g.id
      LEFT JOIN batches b ON m.batch_id = b.id
      LEFT JOIN children ch ON ch.mother_id = m.id
      WHERE m.mother_code LIKE 'MTH-1%'
      GROUP BY m.id`);

    console.log(JSON.stringify(rows, null, 2));

    await pool.end();
    console.log('Done');
  } catch (err) {
    console.error('ERR', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
