const express = require('express');
const router = express.Router();
const pool = require('../db');

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (error) { return {}; }
}

function mapMother(row) {
  const fullName = [
    firstNonEmpty(row.first_name, row.firstName),
    firstNonEmpty(row.middle_name, row.middleName),
    firstNonEmpty(row.last_name, row.lastName),
    firstNonEmpty(row.suffix),
  ].filter((v) => String(v).trim()).join(' ').trim();

  return {
    id: row.mother_code || String(row.id),
    motherId: row.mother_external_id || row.mother_code || String(row.id),
    name: fullName || (row.name || ''),
    firstName: firstNonEmpty(row.first_name, row.firstName, ''),
    middleName: firstNonEmpty(row.middle_name, row.middleName, ''),
    lastName: firstNonEmpty(row.last_name, row.lastName, ''),
    suffix: firstNonEmpty(row.suffix, ''),
    dob: row.dob || '',
    contactNumber: row.contact_number || row.contactNumber || '',
    address: row.address || '',
    community: row.community || row.area || '',
    area: row.area || row.community || '',
    groupId: row.group_id ?? null,
    batchId: row.batch_id ?? null,
    group: row.group_name || '',
    batch: row.batch_name || '',
    lmpDate: row.lmp_date || '',
    eddDate: row.edd_date || '',
    prenatalRegDate: row.prenatal_reg_date || '',
    gestationalAge: row.gestational_age || '',
    trimester: row.trimester || '',
    prenatalWeight: row.prenatal_weight || '',
    prenatalBp: row.prenatal_bp || '',
    prenatalHeight: row.prenatal_height || '',
    fundalHeight: row.fundal_height || '',
    fhr: row.fhr || '',
    gravida: row.gravida ?? '',
    para: row.para ?? '',
    abortion: row.abortion ?? '',
    stillbirth: row.stillbirth ?? '',
    weight: row.weight || '',
    height: row.height || '',
    isHighRisk: row.is_high_risk === true || row.is_high_risk === 1 || row.is_high_risk === '1' ? 'Yes' : 'No',
    programType: row.program_type || '',
    emergencyName: row.emergency_name || '',
    emergencyContact: row.emergency_contact || '',
    emergencyRelationship: row.emergency_relationship || '',
    spouseName: row.spouse_name || '',
    medicalConditions: parseJsonObject(row.medical_conditions),
    otherMedicalHistory: row.other_medical_history || '',
    status: row.status || 'Active',
    progress: Number(row.progress || 0),
    records: Number(row.children_count || row.records || 0),
    childrenCount: Number(row.children_count || row.records || 0),
    raw: row,
  };
}

async function attachClinicalData(mother) {
  const motherDbId = mother.raw?.id;
  if (!motherDbId) return mother;

  const [[obRows], [medicalRows], [dentalRows], [vaccineRows], [checkupRows]] = await Promise.all([
    pool.query('SELECT * FROM mother_ob_history WHERE mother_id = ? ORDER BY seq, id', [motherDbId]),
    pool.query('SELECT * FROM mother_medical_conditions WHERE mother_id = ? ORDER BY id', [motherDbId]),
    pool.query('SELECT * FROM mother_dental_records WHERE mother_id = ? ORDER BY id DESC LIMIT 1', [motherDbId]),
    pool.query('SELECT * FROM mother_vaccinations WHERE mother_id = ? ORDER BY id', [motherDbId]),
    pool.query('SELECT * FROM mother_checkups WHERE mother_id = ? ORDER BY trimester, checkup_number', [motherDbId]),
  ]);

  const checkups = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];
  for (const row of checkupRows) {
    const trimesterIndex = row.trimester === '2nd Trimester' ? 1 : row.trimester === '3rd Trimester' ? 2 : 0;
    const checkupIndex = (row.checkup_number >= 1 && row.checkup_number <= 3) ? (row.checkup_number - 1) : 0;
    checkups[trimesterIndex][checkupIndex] = {
      id: row.id,
      motherId: row.mother_id,
      trimester: row.trimester,
      checkupNumber: row.checkup_number,
      checkupDate: row.checkup_date,
      gestationalAge: row.gestational_age_weeks,
      bp: row.blood_pressure,
      weight: row.weight_kg,
      height: row.height_cm,
      bmi: row.bmi,
      nutritionalStatus: row.nutritional_status,
      fundalHeight: row.fundal_height_cm,
      fhr: row.fetal_heart_rate_bpm,
      serviceProvider: row.service_provider,
      nextCheckupDate: row.next_checkup_date,
      referral: Boolean(row.referred_to_hospital),
      labAssistance: Boolean(row.lab_assistance_provided),
      amount: row.assistance_amount,
      sourceOfFunds: row.source_of_funds,
      facilityType: row.facility_type,
      milkDate: row.milk_subsidy_date,
      milkQuantity: row.milk_quantity_pcs,
      remarks: row.remarks,
      completed: true,
    };
  }

  const medicalConditions = Object.fromEntries(
    medicalRows.map((row) => [row.condition_name, Boolean(row.has_condition)])
  );
  const dental = dentalRows[0] || {};
  const vaccines = Object.fromEntries(vaccineRows.map((row) => [row.vaccine_name, row]));

  return {
    ...mother,
    checkups,
    obHistory: obRows.map((row) => ({
      event: row.event_label || row.event_code,
      gestationalAge: row.gestational_age || '',
      outcome: row.outcome || '',
    })),
    medicalConditions: Object.keys(medicalConditions).length ? medicalConditions : mother.medicalConditions,
    dentalCheckupDate: dental.visit_date || '',
    dentalFacility: dental.treatment || '',
    dentalFindings: dental.treatment || '',
    dentalRemarks: dental.remarks || '',
    tt1Date: vaccines.TT1?.vaccine_date || '',
    tt1Remarks: vaccines.TT1?.remarks || '',
    tt2Date: vaccines.TT2?.vaccine_date || '',
    tt2Remarks: vaccines.TT2?.remarks || '',
    tt3Date: vaccines.TT3?.vaccine_date || '',
    tt3Remarks: vaccines.TT3?.remarks || '',
    tt4Date: vaccines.TT4?.vaccine_date || '',
    tt4Remarks: vaccines.TT4?.remarks || '',
    tt5Date: vaccines.TT5?.vaccine_date || '',
    tt5Remarks: vaccines.TT5?.remarks || '',
  };
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*,
        g.group_name,
        b.name AS batch_name,
        (SELECT COUNT(*) FROM children c WHERE c.mother_id = m.id) AS children_count
      FROM mothers m
      LEFT JOIN groups g ON g.id = m.group_id
      LEFT JOIN batches b ON b.id = m.batch_id
      ORDER BY m.id DESC
    `);

    const [checkupRows] = await pool.query('SELECT * FROM mother_checkups');
    const checkupsByMotherId = {};
    for (const row of checkupRows) {
      if (!checkupsByMotherId[row.mother_id]) {
        checkupsByMotherId[row.mother_id] = [
          [null, null, null],
          [null, null, null],
          [null, null, null]
        ];
      }
      const trimesterIndex = row.trimester === '2nd Trimester' ? 1 : row.trimester === '3rd Trimester' ? 2 : 0;
      const checkupIndex = (row.checkup_number >= 1 && row.checkup_number <= 3) ? (row.checkup_number - 1) : 0;
      checkupsByMotherId[row.mother_id][trimesterIndex][checkupIndex] = {
        id: row.id,
        motherId: row.mother_id,
        trimester: row.trimester,
        checkupNumber: row.checkup_number,
        checkupDate: row.checkup_date,
        gestationalAge: row.gestational_age_weeks,
        bp: row.blood_pressure,
        weight: row.weight_kg,
        height: row.height_cm,
        bmi: row.bmi,
        nutritionalStatus: row.nutritional_status,
        fundalHeight: row.fundal_height_cm,
        fhr: row.fetal_heart_rate_bpm,
        serviceProvider: row.service_provider,
        nextCheckupDate: row.next_checkup_date,
        referral: Boolean(row.referred_to_hospital),
        labAssistance: Boolean(row.lab_assistance_provided),
        amount: row.assistance_amount,
        sourceOfFunds: row.source_of_funds,
        facilityType: row.facility_type,
        milkDate: row.milk_subsidy_date,
        milkQuantity: row.milk_quantity_pcs,
        remarks: row.remarks,
        completed: true,
      };
    }

    res.json({
      mothers: rows.map((r) => {
        const m = mapMother(r);
        m.checkups = checkupsByMotherId[r.id] || [
          [null, null, null],
          [null, null, null],
          [null, null, null]
        ];
        return m;
      })
    });
  } catch (error) {
    console.error('[Mothers API] GET / error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const firstName = firstNonEmpty(b.firstName, b.first_name);
    const middleName = firstNonEmpty(b.middleName, b.middle_name);
    const lastName = firstNonEmpty(b.lastName, b.last_name);
    const suffix = firstNonEmpty(b.suffix, '');
    const motherCode = firstNonEmpty(b.motherCode, b.mother_code, `MTH-${Date.now()}`);
    const motherExternalId = firstNonEmpty(b.motherId, b.mother_id, b.motherExternalId, b.mother_external_id, motherCode);

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO mothers (
        mother_code,
        first_name,
        middle_name,
        last_name,
        suffix,
        dob,
        contact_number,
        community,
        area,
        mother_external_id,
        address,
        group_id,
        batch_id,
        lmp_date,
        edd_date,
        prenatal_reg_date,
        trimester,
        gestational_age,
        prenatal_weight,
        prenatal_bp,
        prenatal_height,
        fundal_height,
        fhr,
        gravida,
        para,
        abortion,
        stillbirth,
        weight,
        height,
        is_high_risk,
        program_type,
        emergency_name,
        emergency_contact,
        emergency_relationship,
        spouse_name,
        medical_conditions,
        other_medical_history
      ) VALUES (${Array(37).fill('?').join(', ')})` ,
      [
        motherCode,
        firstName,
        middleName || null,
        lastName,
        suffix || null,
        firstNonEmpty(b.dob, b.birthDate, null),
        firstNonEmpty(b.contactNumber, b.contact_number, null),
        firstNonEmpty(b.community, b.community_name, ''),
        firstNonEmpty(b.area, ''),
        motherExternalId,
        firstNonEmpty(b.address, ''),
        b.groupId ?? b.group_id ?? null,
        b.batchId ?? b.batch_id ?? null,
        firstNonEmpty(b.lmpDate, b.lmp_date, null),
        firstNonEmpty(b.eddDate, b.edd_date, null),
        firstNonEmpty(b.prenatalRegDate, b.prenatal_reg_date, null),
        firstNonEmpty(b.trimester, null),
        firstNonEmpty(b.gestationalAge, b.gestational_age, null),
        firstNonEmpty(b.prenatalWeight, b.prenatal_weight, null),
        firstNonEmpty(b.prenatalBp, b.prenatal_bp, null),
        firstNonEmpty(b.prenatalHeight, b.prenatal_height, null),
        firstNonEmpty(b.fundalHeight, b.fundal_height, null),
        firstNonEmpty(b.fhr, null),
        b.gravida || null,
        b.para || null,
        b.abortion || 0,
        b.stillbirth || 0,
        firstNonEmpty(b.weight, null),
        firstNonEmpty(b.height, null),
        b.isHighRisk === 'Yes' || b.is_high_risk === true || b.is_high_risk === 1 ? 1 : 0,
        firstNonEmpty(b.programType, b.program_type, null),
        firstNonEmpty(b.emergencyName, b.emergency_name, null),
        firstNonEmpty(b.emergencyContact, b.emergency_contact, null),
        firstNonEmpty(b.emergencyRelationship, b.emergency_relationship, null),
        firstNonEmpty(b.spouseName, b.spouse_name, null),
        b.medicalConditions ? JSON.stringify(b.medicalConditions) : null,
        firstNonEmpty(b.otherMedicalHistory, b.other_medical_history, null),
      ]
    );

    const [rows] = await pool.query('SELECT * FROM mothers WHERE id = ?', [result.insertId]);
    const mother = rows[0];
    if (Array.isArray(b.obHistory)) {
      for (const [index, item] of b.obHistory.entries()) {
        if (item.gestationalAge || item.outcome) {
          await pool.query(
            'INSERT INTO mother_ob_history (mother_id, event_label, gestational_age, outcome, seq) VALUES (?, ?, ?, ?, ?)',
            [result.insertId, item.event || `G${index + 1}`, item.gestationalAge || null, item.outcome || null, index + 1]
          );
        }
      }
    }
    if (b.medicalConditions && typeof b.medicalConditions === 'object') {
      for (const [conditionName, hasCondition] of Object.entries(b.medicalConditions)) {
        if (hasCondition) {
          await pool.query(
            'INSERT INTO mother_medical_conditions (mother_id, condition_name, has_condition) VALUES (?, ?, ?)',
            [result.insertId, conditionName, true]
          );
        }
      }
    }
    for (let index = 1; index <= 5; index += 1) {
      const date = b[`tt${index}Date`];
      const remarks = b[`tt${index}Remarks`];
      if (date || remarks) {
        await pool.query(
          'INSERT INTO mother_vaccinations (mother_id, vaccine_name, vaccine_date, remarks) VALUES (?, ?, ?, ?)',
          [result.insertId, `TT${index}`, date || null, remarks || null]
        );
      }
    }
    if (b.dentalCheckupDate || b.dentalFacility || b.dentalFindings || b.dentalRemarks) {
      await pool.query(
        'INSERT INTO mother_dental_records (mother_id, visit_date, treatment, remarks) VALUES (?, ?, ?, ?)',
        [result.insertId, b.dentalCheckupDate || null, b.dentalFacility || b.dentalFindings || null, b.dentalRemarks || null]
      );
    }
    res.status(201).json({ mother: await attachClinicalData(mapMother(mother)) });
  } catch (error) {
    console.error('[Mothers API] POST / error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT m.*,
        g.group_name,
        b.name AS batch_name,
        (SELECT COUNT(*) FROM children c WHERE c.mother_id = m.id) AS children_count
       FROM mothers m
       LEFT JOIN groups g ON g.id = m.group_id
       LEFT JOIN batches b ON b.id = m.batch_id
       WHERE m.id = ? OR m.mother_code = ? OR m.mother_external_id = ?
       LIMIT 1`,
      [Number(id) || null, id, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Mother not found' });
    }

    res.json({ mother: await attachClinicalData(mapMother(rows[0])) });
  } catch (error) {
    console.error('[Mothers API] GET /:id error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const [existing] = await pool.query('SELECT * FROM mothers WHERE id = ? OR mother_code = ? LIMIT 1', [Number(id) || null, id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'Mother not found' });
    }

    const current = existing[0];
    const motherDbId = current.id;
    const update = {
      first_name: firstNonEmpty(b.firstName, b.first_name, current.first_name),
      middle_name: firstNonEmpty(b.middleName, b.middle_name, current.middle_name),
      last_name: firstNonEmpty(b.lastName, b.last_name, current.last_name),
      suffix: firstNonEmpty(b.suffix, current.suffix),
      dob: b.dob || b.birthDate || current.dob || null,
      contact_number: firstNonEmpty(b.contactNumber, b.contact_number, current.contact_number),
      community: firstNonEmpty(b.community, current.community),
      area: firstNonEmpty(b.area, current.area),
      mother_external_id: firstNonEmpty(b.motherId, b.mother_id, b.motherExternalId, b.mother_external_id, current.mother_external_id),
      address: firstNonEmpty(b.address, current.address),
      group_id: b.groupId ?? b.group_id ?? current.group_id,
      batch_id: b.batchId ?? b.batch_id ?? current.batch_id,
      lmp_date: b.lmpDate || b.lmp_date || current.lmp_date || null,
      edd_date: b.eddDate || b.edd_date || current.edd_date || null,
      prenatal_reg_date: b.prenatalRegDate || b.prenatal_reg_date || current.prenatal_reg_date || null,
      trimester: b.trimester || current.trimester || null,
      gestational_age: b.gestationalAge || b.gestational_age || current.gestational_age || null,
      prenatal_weight: b.prenatalWeight || b.prenatal_weight || current.prenatal_weight || null,
      prenatal_bp: b.prenatalBp || b.prenatal_bp || current.prenatal_bp || null,
      prenatal_height: b.prenatalHeight || b.prenatal_height || current.prenatal_height || null,
      fundal_height: b.fundalHeight || b.fundal_height || current.fundal_height || null,
      fhr: b.fhr || current.fhr || null,
      gravida: b.gravida ?? current.gravida ?? null,
      para: b.para ?? current.para ?? null,
      abortion: b.abortion ?? current.abortion ?? 0,
      stillbirth: b.stillbirth ?? current.stillbirth ?? 0,
      weight: b.weight || current.weight || null,
      height: b.height || current.height || null,
      is_high_risk: b.isHighRisk === 'Yes' || b.is_high_risk === true || b.is_high_risk === 1 ? 1 : 0,
      program_type: b.programType || b.program_type || current.program_type || null,
      emergency_name: b.emergencyName || b.emergency_name || current.emergency_name || null,
      emergency_contact: b.emergencyContact || b.emergency_contact || current.emergency_contact || null,
      emergency_relationship: b.emergencyRelationship || b.emergency_relationship || current.emergency_relationship || null,
      spouse_name: b.spouseName || b.spouse_name || current.spouse_name || null,
      medical_conditions: b.medicalConditions ? JSON.stringify(b.medicalConditions) : current.medical_conditions || null,
      other_medical_history: b.otherMedicalHistory || b.other_medical_history || current.other_medical_history || null,
    };
    await pool.query('UPDATE mothers SET ? WHERE id = ?', [update, motherDbId]);

    await pool.query('DELETE FROM mother_ob_history WHERE mother_id = ?', [motherDbId]);
    for (const [index, item] of (b.obHistory || []).entries()) {
      if (item.gestationalAge || item.outcome) {
        await pool.query(
          'INSERT INTO mother_ob_history (mother_id, event_label, gestational_age, outcome, seq) VALUES (?, ?, ?, ?, ?)',
          [motherDbId, item.event || `G${index + 1}`, item.gestationalAge || null, item.outcome || null, index + 1]
        );
      }
    }

    await pool.query('DELETE FROM mother_medical_conditions WHERE mother_id = ?', [motherDbId]);
    for (const [conditionName, hasCondition] of Object.entries(b.medicalConditions || {})) {
      if (hasCondition) {
        await pool.query(
          'INSERT INTO mother_medical_conditions (mother_id, condition_name, has_condition) VALUES (?, ?, ?)',
          [motherDbId, conditionName, true]
        );
      }
    }

    await pool.query('DELETE FROM mother_vaccinations WHERE mother_id = ?', [motherDbId]);
    for (let index = 1; index <= 5; index += 1) {
      const date = b[`tt${index}Date`];
      const remarks = b[`tt${index}Remarks`];
      if (date || remarks) {
        await pool.query(
          'INSERT INTO mother_vaccinations (mother_id, vaccine_name, vaccine_date, remarks) VALUES (?, ?, ?, ?)',
          [motherDbId, `TT${index}`, date || null, remarks || null]
        );
      }
    }

    await pool.query('DELETE FROM mother_dental_records WHERE mother_id = ?', [motherDbId]);
    if (b.dentalCheckupDate || b.dentalFacility || b.dentalFindings || b.dentalRemarks) {
      await pool.query(
        'INSERT INTO mother_dental_records (mother_id, visit_date, treatment, remarks) VALUES (?, ?, ?, ?)',
        [motherDbId, b.dentalCheckupDate || null, b.dentalFacility || b.dentalFindings || null, b.dentalRemarks || null]
      );
    }

    const [rows] = await pool.query(
      `SELECT m.*, g.group_name, b.name AS batch_name
       FROM mothers m
       LEFT JOIN groups g ON g.id = m.group_id
       LEFT JOIN batches b ON b.id = m.batch_id
       WHERE m.id = ?`,
      [motherDbId]
    );
    res.json({ mother: await attachClinicalData(mapMother(rows[0])) });
  } catch (error) {
    console.error('[Mothers API] PUT /:id error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM mothers WHERE id = ? OR mother_code = ?', [Number(id) || null, id]);
    res.json({ success: true, deleted: result.affectedRows > 0 });
  } catch (error) {
    console.error('[Mothers API] DELETE /:id error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/checkups', async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const [motherRows] = await pool.query(
      'SELECT id FROM mothers WHERE id = ? OR mother_code = ? OR mother_external_id = ? LIMIT 1',
      [Number(id) || null, id, id]
    );
    if (!motherRows.length) {
      return res.status(404).json({ error: 'Mother not found' });
    }
    const motherDbId = motherRows[0].id;

    const trimester = b.trimester || '1st Trimester';
    const checkupNumber = Number(b.checkupNumber);
    if (!checkupNumber || checkupNumber < 1 || checkupNumber > 3) {
      return res.status(400).json({ error: 'Valid checkupNumber (1-3) is required' });
    }

    const checkupDate = b.checkupDate || null;
    const gestationalAgeWeeks = b.gestationalAge || null;
    const bloodPressure = b.bp || null;
    const weightKg = b.weight || null;
    const heightCm = b.height || null;
    const bmi = b.bmi || null;
    const nutritionalStatus = b.nutritionalStatus || null;
    const fundalHeightCm = b.fundalHeight || null;
    const fetalHeartRateBpm = b.fhr || null;
    const serviceProvider = b.serviceProvider || null;
    const nextCheckupDate = b.nextCheckupDate || null;
    const referredToHospital = b.referral === true || b.referral === 1 || b.referral === 'true' ? 1 : 0;
    const labAssistanceProvided = b.labAssistance === true || b.labAssistance === 1 || b.labAssistance === 'true' ? 1 : 0;
    const assistanceAmount = b.amount || null;
    const sourceOfFunds = b.sourceOfFunds || null;
    const facilityType = b.facilityType || null;
    const milkSubsidyDate = b.milkDate || null;
    const milkQuantityPcs = b.milkQuantity || null;
    const remarks = b.remarks || null;

    await pool.query(
      `INSERT INTO mother_checkups (
        mother_id, trimester, checkup_number, checkup_date,
        gestational_age_weeks, blood_pressure, weight_kg, height_cm,
        bmi, nutritional_status, fundal_height_cm, fetal_heart_rate_bpm,
        service_provider, next_checkup_date, referred_to_hospital,
        lab_assistance_provided, assistance_amount, source_of_funds,
        facility_type, milk_subsidy_date, milk_quantity_pcs, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        checkup_date = VALUES(checkup_date),
        gestational_age_weeks = VALUES(gestational_age_weeks),
        blood_pressure = VALUES(blood_pressure),
        weight_kg = VALUES(weight_kg),
        height_cm = VALUES(height_cm),
        bmi = VALUES(bmi),
        nutritional_status = VALUES(nutritional_status),
        fundal_height_cm = VALUES(fundal_height_cm),
        fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm),
        service_provider = VALUES(service_provider),
        next_checkup_date = VALUES(next_checkup_date),
        referred_to_hospital = VALUES(referred_to_hospital),
        lab_assistance_provided = VALUES(lab_assistance_provided),
        assistance_amount = VALUES(assistance_amount),
        source_of_funds = VALUES(source_of_funds),
        facility_type = VALUES(facility_type),
        milk_subsidy_date = VALUES(milk_subsidy_date),
        milk_quantity_pcs = VALUES(milk_quantity_pcs),
        remarks = VALUES(remarks)`,
      [
        motherDbId, trimester, checkupNumber, checkupDate,
        gestationalAgeWeeks, bloodPressure, weightKg, heightCm,
        bmi, nutritionalStatus, fundalHeightCm, fetalHeartRateBpm,
        serviceProvider, nextCheckupDate, referredToHospital,
        labAssistanceProvided, assistanceAmount, sourceOfFunds,
        facilityType, milkSubsidyDate, milkQuantityPcs, remarks
      ]
    );

    await pool.query(
      `UPDATE mothers SET progress = LEAST(100, ROUND(
        (SELECT COUNT(*) FROM mother_checkups WHERE mother_id = ?) * 100 / 9
      )) WHERE id = ?`,
      [motherDbId, motherDbId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save mother checkup:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
