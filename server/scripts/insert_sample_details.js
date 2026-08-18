const pool = require('../db');

async function tableExists(name) {
  const [rows] = await pool.query("SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [name]);
  return rows[0].cnt > 0;
}

async function insert() {
  try {
    // We'll target existing mother and child ids inserted earlier (ids 1..3)
    const [mothers] = await pool.query("SELECT id, mother_code FROM mothers ORDER BY id ASC LIMIT 10");
    const [children] = await pool.query("SELECT id, child_code, mother_id FROM children ORDER BY id ASC LIMIT 20");

    if (!mothers.length) {
      console.log('No mothers found to add details for');
      await pool.end();
      return;
    }

    // Update mothers with more details
    for (const m of mothers) {
      const updates = {
        address: '123 ' + (m.mother_code || 'Main St') + ', Poblacion',
        program_type: 'Maternal Health Program',
        is_high_risk: m.id === 2 ? 1 : 0,
        prenatal_weight: m.id === 1 ? 64.5 : null,
        prenatal_bp: m.id === 1 ? '120/80' : null,
        emergency_name: m.id === 1 ? 'Ana Cruz' : null,
        emergency_contact: m.id === 1 ? '09171230000' : null
      };
      await pool.query(`UPDATE mothers SET address = ?, program_type = ?, is_high_risk = ?, prenatal_weight = ?, prenatal_bp = ?, emergency_name = ?, emergency_contact = ? WHERE id = ?`,
        [updates.address, updates.program_type, updates.is_high_risk, updates.prenatal_weight, updates.prenatal_bp, updates.emergency_name, updates.emergency_contact, m.id]);
    }

    // Insert mother_ob_history if exists
    if (await tableExists('mother_ob_history')) {
      for (const m of mothers) {
        await pool.query(`INSERT INTO mother_ob_history (mother_id, event_label, gestational_age, outcome, seq) VALUES (?, ?, ?, ?, ?)`, [m.id, 'Visit 1', '12 weeks', 'Normal visit', 1]);
        await pool.query(`INSERT INTO mother_ob_history (mother_id, event_label, gestational_age, outcome, seq) VALUES (?, ?, ?, ?, ?)`, [m.id, 'Visit 2', '24 weeks', 'Reviewed growth', 2]);
      }
      console.log('Inserted mother_ob_history rows');
    } else {
      console.log('mother_ob_history table not found; skipping');
    }

    // Insert mother_vaccinations / mother_vaccines if exists
    const mvName = (await tableExists('mother_vaccinations')) ? 'mother_vaccinations' : (await tableExists('mother_vaccines') ? 'mother_vaccines' : null);
    if (mvName) {
      for (const m of mothers) {
        await pool.query(`INSERT INTO ${mvName} (mother_id, vaccine_name, vaccine_date, remarks) VALUES (?, ?, ?, ?)`, [m.id, 'Tetanus', '2026-01-15', 'Given at clinic']);
      }
      console.log('Inserted', mvName, 'rows');
    } else {
      console.log('No mother_vaccination table found; skipping');
    }

    // Insert mother_medical_conditions if exists
    if (await tableExists('mother_medical_conditions')) {
      await pool.query(`INSERT INTO mother_medical_conditions (mother_id, condition_name, has_condition) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)`,
        [1, 'Hypertension', 0, 2, 'Diabetes', 1, 3, 'Anemia', 0]);
      console.log('Inserted mother_medical_conditions rows');
    } else {
      console.log('mother_medical_conditions not found; skipping');
    }

    // For children: insert child_vaccinations, child_medical_conditions, child_checkups
    if (await tableExists('child_vaccinations')) {
      for (const c of children) {
        await pool.query(`INSERT INTO child_vaccinations (child_id, vaccine_name, vaccine_date, remarks) VALUES (?, ?, ?, ?)`, [c.id, 'BCG', '2026-07-20', 'At birth']);
      }
      console.log('Inserted child_vaccinations rows');
    } else if (await tableExists('child_vaccines')) {
      for (const c of children) {
        await pool.query(`INSERT INTO child_vaccines (child_id, vaccine_code, date_given, remarks) VALUES (?, ?, ?, ?)`, [c.id, 'BCG', '2026-07-20', 'At birth']);
      }
      console.log('Inserted child_vaccines rows');
    } else {
      console.log('No child vaccination table found; skipping');
    }

    if (await tableExists('child_medical_conditions')) {
      for (const c of children) {
        await pool.query(`INSERT INTO child_medical_conditions (child_id, condition_name, has_condition) VALUES (?, ?, ?)`, [c.id, 'Low Weight', 0]);
      }
      console.log('Inserted child_medical_conditions rows');
    } else {
      console.log('child_medical_conditions not found; skipping');
    }

    if (await tableExists('child_checkups')) {
      for (const c of children) {
        await pool.query(`INSERT INTO child_checkups (child_id, visit_date, weight, height, head_circumference, notes) VALUES (?, ?, ?, ?, ?, ?)`, [c.id, '2026-08-01', 3.2, 50.0, 34.0, 'Routine check']);
      }
      console.log('Inserted child_checkups rows');
    } else {
      console.log('child_checkups not found; skipping');
    }

    console.log('DETAILS_INSERT_COMPLETE');
    await pool.end();
  } catch (err) {
    console.error('DETAILS_INSERT_ERR', err.message || err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

insert();
