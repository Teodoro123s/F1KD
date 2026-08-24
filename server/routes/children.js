const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to normalize incoming body keys (accept camelCase or snake_case)
function getField(body, ...keys) {
  for (const k of keys) {
    if (body[k] !== undefined) return body[k];
  }
  return null;
}

async function attachClinicalData(child) {
  const [[medicalRows], [vaccineRows], [checkupRows]] = await Promise.all([
    pool.query('SELECT * FROM child_medical_conditions WHERE child_id = ? ORDER BY id', [child.id]),
    pool.query('SELECT * FROM child_vaccinations WHERE child_id = ? ORDER BY id', [child.id]),
    pool.query('SELECT * FROM child_checkups WHERE child_id = ? ORDER BY week_number, id', [child.id]),
  ]);
  return {
    ...child,
    medicalConditions: Object.fromEntries(medicalRows.map((row) => [row.condition_name, Boolean(row.has_condition)])),
    ...Object.fromEntries(vaccineRows.map((row) => [row.vaccine_name, row])),
    checkups: checkupRows.map(row => ({
      id: row.id,
      childId: row.child_id,
      checkupDate: row.visit_date,
      weight: row.weight,
      height: row.height,
      headCircumference: row.head_circumference,
      developmentalStatus: row.developmental_status,
      serviceProvider: row.service_provider,
      remarks: row.notes,
      week: row.week_number
    })),
    completedWeeks: checkupRows.map(row => row.week_number).filter(Boolean).sort((a, b) => a - b)
  };
}

// POST /api/children - create a child
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    let motherId = getField(b, 'motherId', 'mother_id');
    let communityId = getField(b, 'communityId', 'community_id');
    let groupId = getField(b, 'groupId', 'group_id');
    let batchId = getField(b, 'batchId', 'batch_id');
    const firstName = getField(b, 'firstName', 'first_name');
    const middleName = getField(b, 'middleName', 'middle_name');
    const lastName = getField(b, 'lastName', 'last_name');
    const suffix = getField(b, 'suffix');
    const birthDate = getField(b, 'birthDate', 'birth_date');
    const birthWeight = getField(b, 'birthWeight', 'birth_weight');
    const birthLength = getField(b, 'birthLength', 'birth_length');
    const gender = getField(b, 'gender');
    const bloodType = getField(b, 'bloodType', 'blood_type');
    const noOfChildDelivered = getField(b, 'noOfChildDelivered', 'no_of_child_delivered');
    const exclusiveBreastfeeding = getField(b, 'exclusiveBreastfeeding', 'exclusive_breastfeeding');
    const expandedNewbornScreening = getField(b, 'expandedNewbornScreening', 'expanded_newborn_screening');
    const expandedNewbornScreeningResult = getField(b, 'expandedNewbornScreeningResult', 'expanded_newborn_screening_result');
    const deliveryType = getField(b, 'deliveryType', 'delivery_type');
    const healthStatus = getField(b, 'healthStatus', 'health_status');
    const birthPlace = getField(b, 'birthPlace', 'birth_place');
    const birthAttendant = getField(b, 'birthAttendant', 'birth_attendant');
    const apgarScore = getField(b, 'apgarScore', 'apgar_score');
    const feedingType = getField(b, 'feedingType', 'feeding_type');
    const nutritionNotes = getField(b, 'nutritionNotes', 'nutrition_notes');

    if (!motherId || !firstName || !lastName) return res.status(400).json({ error: 'motherId, firstName and lastName are required' });

    const [motherRows] = await pool.query(
      'SELECT id FROM mothers WHERE id = ? OR mother_code = ? OR mother_external_id = ? LIMIT 1',
      [Number(motherId) || null, motherId, motherId]
    );
    if (!motherRows.length) return res.status(400).json({ error: 'Mother not found' });
    motherId = motherRows[0].id;
    if (!groupId && b.group) {
      const [groupRows] = await pool.query('SELECT id FROM groups WHERE group_name = ? LIMIT 1', [b.group]);
      groupId = groupRows[0]?.id || null;
    }
    if (!communityId && b.community) {
      const [communityRows] = await pool.query('SELECT id FROM communities WHERE name = ? LIMIT 1', [b.community]);
      communityId = communityRows[0]?.id || null;
    }
    if (!batchId && b.batch) {
      const [batchRows] = await pool.query('SELECT id FROM batches WHERE id = ? OR batch_code = ? OR name = ? LIMIT 1', [Number(b.batch) || null, b.batch, b.batch]);
      batchId = batchRows[0]?.id || null;
    }

    // generate child_code
    const childCode = `C-${Date.now()}`;

    const fatherName = getField(b, 'fatherName', 'father_name');
    const relationship = getField(b, 'relationship');
    const address = getField(b, 'address');

    const [result] = await pool.query(
      `INSERT INTO children (child_code, mother_id, community_id, group_id, batch_id, first_name, middle_name, last_name, suffix, birth_date, birth_weight, birth_length, gender, blood_type, no_of_child_delivered, exclusive_breastfeeding, expanded_newborn_screening, expanded_newborn_screening_result, delivery_type, health_status, birth_place, birth_attendant, apgar_score, feeding_type, nutrition_notes, father_name, relationship, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [childCode, motherId || null, communityId || null, groupId || null, batchId || null, firstName, middleName || null, lastName, suffix || null, birthDate || null, birthWeight || null, birthLength || null, gender || null, bloodType || null, noOfChildDelivered || null, exclusiveBreastfeeding || null, expandedNewbornScreening || null, expandedNewbornScreeningResult || null, deliveryType || null, healthStatus || null, birthPlace || null, birthAttendant || null, apgarScore || null, feedingType || null, nutritionNotes || null, fatherName || null, relationship || null, address || null]
    );

    for (const [conditionName, hasCondition] of Object.entries(b.medicalConditions || {})) {
      if (hasCondition) await pool.query(
        'INSERT INTO child_medical_conditions (child_id, condition_name, has_condition) VALUES (?, ?, ?)',
        [result.insertId, conditionName, true]
      );
    }

    const vaccines = [
      ['BCG', b.bcgDate, b.bcgRemarks], ['HepB', b.hepbDate, b.hepbRemarks],
      ['OPV', b.opvDate, b.opvRemarks], ['DPT', b.dptDate, b.dptRemarks],
      ['MMR', b.mmrDate, b.mmrRemarks],
    ];
    for (const [name, date, remarks] of vaccines) {
      if (date || remarks) await pool.query(
        'INSERT INTO child_vaccinations (child_id, vaccine_name, vaccine_date, remarks) VALUES (?, ?, ?, ?)',
        [result.insertId, name, date || null, remarks || null]
      );
    }

    const [rows] = await pool.query(
      `SELECT c.*, m.first_name AS mother_first_name, m.last_name AS mother_last_name, m.mother_code,
        comm.name AS community_name, g.group_name, b.name AS batch_name
       FROM children c
       LEFT JOIN mothers m ON m.id = c.mother_id
       LEFT JOIN communities comm ON comm.id = c.community_id
       LEFT JOIN groups g ON g.id = c.group_id
       LEFT JOIN batches b ON b.id = c.batch_id
       WHERE c.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ child: await attachClinicalData(rows[0]) });
  } catch (err) {
    console.error('Failed to create child:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/children/:id
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, m.id AS mother_db_id, m.mother_code,
        comm.name AS community_name, g.group_name, b.name AS batch_name
      FROM children c
      LEFT JOIN mothers m ON m.id = c.mother_id
      LEFT JOIN communities comm ON comm.id = c.community_id
      LEFT JOIN groups g ON g.id = c.group_id
      LEFT JOIN batches b ON b.id = c.batch_id
      ORDER BY c.created_at DESC
    `);

    const [checkupRows] = await pool.query('SELECT * FROM child_checkups');
    const checkupsByChildId = {};
    const completedWeeksByChildId = {};
    for (const row of checkupRows) {
      if (!checkupsByChildId[row.child_id]) {
        checkupsByChildId[row.child_id] = [];
        completedWeeksByChildId[row.child_id] = [];
      }
      checkupsByChildId[row.child_id].push({
        id: row.id,
        childId: row.child_id,
        checkupDate: row.visit_date,
        weight: row.weight,
        height: row.height,
        headCircumference: row.head_circumference,
        developmentalStatus: row.developmental_status,
        serviceProvider: row.service_provider,
        remarks: row.notes,
        week: row.week_number
      });
      if (row.week_number) {
        completedWeeksByChildId[row.child_id].push(row.week_number);
      }
    }

    const children = rows.map(r => {
      const childId = r.id;
      return {
        ...r,
        checkups: checkupsByChildId[childId] || [],
        completedWeeks: (completedWeeksByChildId[childId] || []).sort((a, b) => a - b)
      };
    });

    res.json({ children });
  } catch (err) {
    console.error('Failed to fetch children:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT c.*, m.first_name AS mother_first_name, m.last_name AS mother_last_name, m.mother_code AS mother_code,
        comm.name AS community_name, g.group_name, b.name AS batch_name
       FROM children c
       LEFT JOIN mothers m ON c.mother_id = m.id
       LEFT JOIN communities comm ON comm.id = c.community_id
       LEFT JOIN groups g ON g.id = c.group_id
       LEFT JOIN batches b ON b.id = c.batch_id
       WHERE c.id = ? OR c.child_code = ?`,
      [id, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ child: await attachClinicalData(rows[0]) });
  } catch (err) {
    console.error('Failed to fetch child:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const [existingRows] = await pool.query('SELECT * FROM children WHERE id = ? OR child_code = ? LIMIT 1', [Number(id) || null, id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Child not found' });
    const current = existingRows[0];
    let motherId = getField(body, 'motherId', 'mother_id') || current.mother_id;
    const [motherRows] = await pool.query(
      'SELECT id FROM mothers WHERE id = ? OR mother_code = ? OR mother_external_id = ? LIMIT 1',
      [Number(motherId) || null, motherId, motherId]
    );
    if (!motherRows.length) return res.status(400).json({ error: 'Mother not found' });
    motherId = motherRows[0].id;

    let communityId = getField(body, 'communityId', 'community_id') || current.community_id;
    let groupId = getField(body, 'groupId', 'group_id') || current.group_id;
    let batchId = getField(body, 'batchId', 'batch_id') || current.batch_id;
    if (!groupId && body.group) {
      const [groupRows] = await pool.query('SELECT id FROM groups WHERE group_name = ? LIMIT 1', [body.group]);
      groupId = groupRows[0]?.id || null;
    }
    if (!communityId && body.community) {
      const [communityRows] = await pool.query('SELECT id FROM communities WHERE name = ? LIMIT 1', [body.community]);
      communityId = communityRows[0]?.id || null;
    }
    if (!batchId && body.batch) {
      const [batchRows] = await pool.query('SELECT id FROM batches WHERE id = ? OR batch_code = ? OR name = ? LIMIT 1', [Number(body.batch) || null, body.batch, body.batch]);
      batchId = batchRows[0]?.id || null;
    }

    const update = {
      mother_id: motherId,
      community_id: communityId,
      group_id: groupId,
      batch_id: batchId,
      first_name: getField(body, 'firstName', 'first_name') ?? current.first_name,
      middle_name: getField(body, 'middleName', 'middle_name') ?? current.middle_name,
      last_name: getField(body, 'lastName', 'last_name') ?? current.last_name,
      suffix: getField(body, 'suffix') ?? current.suffix,
      birth_date: getField(body, 'birthDate', 'birth_date') || current.birth_date || null,
      birth_weight: getField(body, 'birthWeight', 'birth_weight') || current.birth_weight || null,
      birth_length: getField(body, 'birthLength', 'birth_length') || current.birth_length || null,
      gender: getField(body, 'gender') || current.gender,
      blood_type: getField(body, 'bloodType', 'blood_type') ?? current.blood_type ?? null,
      no_of_child_delivered: getField(body, 'noOfChildDelivered', 'no_of_child_delivered') ?? current.no_of_child_delivered ?? null,
      exclusive_breastfeeding: getField(body, 'exclusiveBreastfeeding', 'exclusive_breastfeeding') ?? current.exclusive_breastfeeding ?? null,
      expanded_newborn_screening: getField(body, 'expandedNewbornScreening', 'expanded_newborn_screening') ?? current.expanded_newborn_screening ?? null,
      expanded_newborn_screening_result: getField(body, 'expandedNewbornScreeningResult', 'expanded_newborn_screening_result') ?? current.expanded_newborn_screening_result ?? null,
      delivery_type: getField(body, 'deliveryType', 'delivery_type') || current.delivery_type || null,
      health_status: getField(body, 'healthStatus', 'health_status') || current.health_status || null,
      birth_place: getField(body, 'birthPlace', 'birth_place') || current.birth_place || null,
      birth_attendant: getField(body, 'birthAttendant', 'birth_attendant') || current.birth_attendant || null,
      apgar_score: getField(body, 'apgarScore', 'apgar_score') || current.apgar_score || null,
      feeding_type: getField(body, 'feedingType', 'feeding_type') || current.feeding_type || null,
      nutrition_notes: getField(body, 'nutritionNotes', 'nutrition_notes') || current.nutrition_notes || null,
      father_name: getField(body, 'fatherName', 'father_name') || current.father_name || null,
      relationship: getField(body, 'relationship') || current.relationship || null,
      address: getField(body, 'address') || current.address || null,
    };
    await pool.query('UPDATE children SET ? WHERE id = ?', [update, current.id]);

    await pool.query('DELETE FROM child_medical_conditions WHERE child_id = ?', [current.id]);
    for (const [conditionName, hasCondition] of Object.entries(body.medicalConditions || {})) {
      if (hasCondition) await pool.query(
        'INSERT INTO child_medical_conditions (child_id, condition_name, has_condition) VALUES (?, ?, ?)',
        [current.id, conditionName, true]
      );
    }
    await pool.query('DELETE FROM child_vaccinations WHERE child_id = ?', [current.id]);
    const vaccines = [
      ['BCG', body.bcgDate, body.bcgRemarks], ['HepB', body.hepbDate, body.hepbRemarks],
      ['OPV', body.opvDate, body.opvRemarks], ['DPT', body.dptDate, body.dptRemarks],
      ['MMR', body.mmrDate, body.mmrRemarks],
    ];
    for (const [name, date, remarks] of vaccines) {
      if (date || remarks) await pool.query(
        'INSERT INTO child_vaccinations (child_id, vaccine_name, vaccine_date, remarks) VALUES (?, ?, ?, ?)',
        [current.id, name, date || null, remarks || null]
      );
    }

    const [rows] = await pool.query(
      `SELECT c.*, m.first_name AS mother_first_name, m.last_name AS mother_last_name, m.mother_code,
        comm.name AS community_name, g.group_name, b.name AS batch_name
       FROM children c LEFT JOIN mothers m ON m.id = c.mother_id
       LEFT JOIN communities comm ON comm.id = c.community_id
       LEFT JOIN groups g ON g.id = c.group_id
       LEFT JOIN batches b ON b.id = c.batch_id
       WHERE c.id = ?`,
      [current.id]
    );
    res.json({ child: await attachClinicalData(rows[0]) });
  } catch (error) {
    console.error('Failed to update child:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/mothers/:motherId/children
router.get('/mother/:motherId/children', async (req, res) => {
  try {
    const { motherId } = req.params;
    const [motherRows] = await pool.query(
      'SELECT id FROM mothers WHERE id = ? OR mother_code = ? OR mother_external_id = ? LIMIT 1',
      [Number(motherId) || null, motherId, motherId]
    );
    if (!motherRows.length) return res.status(404).json({ error: 'Mother not found' });
    const [rows] = await pool.query(
      `SELECT c.*, comm.name AS community_name, g.group_name, b.name AS batch_name
       FROM children c
       LEFT JOIN communities comm ON comm.id = c.community_id
       LEFT JOIN groups g ON g.id = c.group_id
       LEFT JOIN batches b ON b.id = c.batch_id
       WHERE c.mother_id = ? ORDER BY c.created_at DESC`,
      [motherRows[0].id]
    );
    res.json({ children: rows });
  } catch (err) {
    console.error('Failed to fetch children for mother:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
