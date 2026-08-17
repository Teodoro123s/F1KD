const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'f1kd',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
});

async function seed() {
  const connection = await pool.getConnection();
  try {
    const communities = [
      { community_code: 'SCH-0001', name: 'San Isidro High School', area: 'Poblacion' },
      { community_code: 'SCH-0002', name: 'Poblacion National School', area: 'Poblacion' },
      { community_code: 'SCH-0003', name: 'Sto. Niño Academy', area: 'Poblacion' },
      { community_code: 'SCH-0004', name: 'San Jose Elementary', area: 'Upland' },
      { community_code: 'SCH-0005', name: 'Central City High', area: 'Downtown' },
      { community_code: 'SCH-0006', name: 'Nueva Technical School', area: 'Coastal' },
      { community_code: 'SCH-0007', name: 'Kabuntalan Integrated School', area: 'Riverside' },
      { community_code: 'SCH-0008', name: 'San Miguel Prep', area: 'Highland' },
      { community_code: 'SCH-0009', name: 'Luntian Elementary', area: 'Forest' },
      { community_code: 'SCH-0010', name: 'Dela Cruz High School', area: 'Lowland' },
      { community_code: 'SCH-0011', name: 'Malaya Community School', area: 'Coastal' },
      { community_code: 'SCH-0012', name: 'Luntian Hills School', area: 'Highland' },
    ];

    const batches = [
      { batch_code: 'BAT-0001', community_code: 'SCH-0001', name: 'Batch 1', records: 2, progress: 68, status: 'Active' },
      { batch_code: 'BAT-0002', community_code: 'SCH-0001', name: 'Batch 2', records: 1, progress: 45, status: 'Active' },
      { batch_code: 'BAT-0003', community_code: 'SCH-0002', name: 'Batch 3', records: 2, progress: 92, status: 'Completed' },
      { batch_code: 'BAT-0004', community_code: 'SCH-0003', name: 'Batch 4', records: 2, progress: 100, status: 'Completed' },
      { batch_code: 'BAT-0005', community_code: 'SCH-0003', name: 'Batch 5', records: 2, progress: 57, status: 'Active' },
      { batch_code: 'BAT-0006', community_code: 'SCH-0004', name: 'Batch 6', records: 3, progress: 18, status: 'Pending' },
      { batch_code: 'BAT-0007', community_code: 'SCH-0004', name: 'Batch 7', records: 3, progress: 74, status: 'Active' },
      { batch_code: 'BAT-0008', community_code: 'SCH-0004', name: 'Batch 8', records: 2, progress: 63, status: 'Active' },
      { batch_code: 'BAT-0009', community_code: 'SCH-0005', name: 'Batch 9', records: 4, progress: 88, status: 'Completed' },
      { batch_code: 'BAT-0010', community_code: 'SCH-0005', name: 'Batch 10', records: 3, progress: 41, status: 'Active' },
      { batch_code: 'BAT-0011', community_code: 'SCH-0005', name: 'Batch 11', records: 3, progress: 22, status: 'Pending' },
      { batch_code: 'BAT-0012', community_code: 'SCH-0005', name: 'Batch 12', records: 2, progress: 50, status: 'Active' },
    ];

    const groups = [
      { group_code: 'GRP-0001', community_code: 'SCH-0001', name: 'Group Alpha', leader: 'Liza Reyes', members_count: 12, status: 'Active' },
      { group_code: 'GRP-0002', community_code: 'SCH-0002', name: 'Group Bravo', leader: 'Marco Santos', members_count: 8, status: 'Pending' },
      { group_code: 'GRP-0003', community_code: 'SCH-0003', name: 'Group Delta', leader: 'Ana Cruz', members_count: 15, status: 'Active' },
      { group_code: 'GRP-0004', community_code: 'SCH-0004', name: 'Group Sierra', leader: 'Renato Diaz', members_count: 6, status: 'Completed' },
      { group_code: 'GRP-0005', community_code: 'SCH-0005', name: 'Group Central', leader: 'May Torres', members_count: 9, status: 'Active' },
    ];

    const groupBatchMap = {
      'GRP-0001': ['BAT-0001', 'BAT-0002'],
      'GRP-0002': ['BAT-0003'],
      'GRP-0003': ['BAT-0004', 'BAT-0005', 'BAT-0008'],
      'GRP-0004': [],
      'GRP-0005': ['BAT-0009'],
    };

    const mothers = [
      { mother_code: 'MTH-0001', community_code: 'SCH-0001', group_code: 'GRP-0001', batch_code: 'BAT-0001', first_name: 'Lucia', middle_name: 'Dela', last_name: 'Torres', dob: '1994-06-21', lmp_date: '2026-02-05', edd_date: '2026-11-12', contact_number: '09171234567', is_high_risk: 0, program_type: 'Maternal Health Program', emergency_name: 'Juan Torres', emergency_contact: '09187654321', emergency_relationship: 'Husband', spouse_name: 'Juan Torres', address: '12 Mabini St, Poblacion', prenatal_reg_date: '2026-03-15', trimester: '1st Trimester', gestational_age: 12, prenatal_weight: 58.4, prenatal_bp: '110/70', prenatal_height: '150', fundal_height: '12', fhr: '140', gravida: 2, para: 1, abortion: 0, stillbirth: 0, status: 'Active', visits: 3, progress: 72 },
      { mother_code: 'MTH-0002', community_code: 'SCH-0001', group_code: 'GRP-0001', batch_code: 'BAT-0001', first_name: 'Elaine', middle_name: 'Santos', last_name: 'Cruz', dob: '1993-09-14', lmp_date: '2026-02-09', edd_date: '2026-11-16', contact_number: '09176543210', is_high_risk: 0, program_type: 'Maternal Health Program', emergency_name: 'Pedro Cruz', emergency_contact: '09181234567', emergency_relationship: 'Partner', spouse_name: 'Pedro Cruz', address: '14 Rizal St, Poblacion', prenatal_reg_date: '2026-03-17', trimester: '1st Trimester', gestational_age: 11, prenatal_weight: 60.1, prenatal_bp: '120/80', prenatal_height: '156', fundal_height: '13', fhr: '142', gravida: 1, para: 0, abortion: 0, stillbirth: 0, status: 'Pending', visits: 2, progress: 46 },
      { mother_code: 'MTH-0003', community_code: 'SCH-0001', group_code: 'GRP-0001', batch_code: 'BAT-0002', first_name: 'Nina', middle_name: 'M.', last_name: 'Santos', dob: '1992-04-11', lmp_date: '2026-03-02', edd_date: '2026-12-09', contact_number: '09179876543', is_high_risk: 0, program_type: 'Maternal Health Program', emergency_name: 'Ramon Santos', emergency_contact: '09182223344', emergency_relationship: 'Husband', spouse_name: 'Ramon Santos', address: '7 Bonifacio St, Poblacion', prenatal_reg_date: '2026-03-21', trimester: '1st Trimester', gestational_age: 10, prenatal_weight: 57.8, prenatal_bp: '118/76', prenatal_height: '154', fundal_height: '11', fhr: '138', gravida: 2, para: 1, abortion: 0, stillbirth: 0, status: 'Active', visits: 1, progress: 32 },
      { mother_code: 'MTH-0004', community_code: 'SCH-0002', group_code: 'GRP-0002', batch_code: 'BAT-0003', first_name: 'Vera', middle_name: 'D.,', last_name: 'Lopez', dob: '1989-11-03', lmp_date: '2025-12-10', edd_date: '2026-09-17', contact_number: '09170345678', is_high_risk: 1, program_type: 'Maternal Health Program', emergency_name: 'Jose Lopez', emergency_contact: '09185556677', emergency_relationship: 'Husband', spouse_name: 'Jose Lopez', address: '25 Maharlika St, Poblacion', prenatal_reg_date: '2026-01-16', trimester: '2nd Trimester', gestational_age: 22, prenatal_weight: 62.2, prenatal_bp: '130/90', prenatal_height: '158', fundal_height: '19', fhr: '146', gravida: 3, para: 2, abortion: 0, stillbirth: 0, status: 'Completed', visits: 4, progress: 100 },
      { mother_code: 'MTH-0005', community_code: 'SCH-0003', group_code: 'GRP-0003', batch_code: 'BAT-0004', first_name: 'Cecilia', middle_name: 'R.', last_name: 'Diaz', dob: '1991-08-10', lmp_date: '2026-04-01', edd_date: '2027-01-08', contact_number: '09173456789', is_high_risk: 0, program_type: 'Maternal Health Program', emergency_name: 'Arman Diaz', emergency_contact: '09189998877', emergency_relationship: 'Partner', spouse_name: 'Arman Diaz', address: '8 Acacia St, Upland', prenatal_reg_date: '2026-04-25', trimester: '1st Trimester', gestational_age: 9, prenatal_weight: 54.6, prenatal_bp: '110/70', prenatal_height: '152', fundal_height: '10', fhr: '139', gravida: 1, para: 0, abortion: 0, stillbirth: 0, status: 'Active', visits: 2, progress: 58 },
      { mother_code: 'MTH-0006', community_code: 'SCH-0003', group_code: 'GRP-0003', batch_code: 'BAT-0005', first_name: 'Marta', middle_name: 'A.', last_name: 'Reyes', dob: '1990-01-22', lmp_date: '2026-02-20', edd_date: '2026-11-27', contact_number: '09170001234', is_high_risk: 0, program_type: 'Maternal Health Program', emergency_name: 'Peter Reyes', emergency_contact: '09183334444', emergency_relationship: 'Husband', spouse_name: 'Peter Reyes', address: '19 Mapang-akit St, Poblacion', prenatal_reg_date: '2026-03-05', trimester: '1st Trimester', gestational_age: 12, prenatal_weight: 59.6, prenatal_bp: '116/72', prenatal_height: '153', fundal_height: '12', fhr: '141', gravida: 2, para: 1, abortion: 0, stillbirth: 0, status: 'Pending', visits: 3, progress: 42 },
      { mother_code: 'MTH-0007', community_code: 'SCH-0005', group_code: 'GRP-0005', batch_code: 'BAT-0009', first_name: 'Rhea', middle_name: 'M.', last_name: 'Garcia', dob: '1995-03-18', lmp_date: '2025-11-13', edd_date: '2026-08-20', contact_number: '09170987654', is_high_risk: 0, program_type: 'Maternal Health Program', emergency_name: 'Luis Garcia', emergency_contact: '09187778899', emergency_relationship: 'Husband', spouse_name: 'Luis Garcia', address: '11 Mayon St, Downtown', prenatal_reg_date: '2025-12-18', trimester: '3rd Trimester', gestational_age: 34, prenatal_weight: 64.8, prenatal_bp: '118/78', prenatal_height: '155', fundal_height: '31', fhr: '145', gravida: 2, para: 1, abortion: 0, stillbirth: 0, status: 'Active', visits: 5, progress: 88 },
    ];

    const communityCodes = new Map(communities.map((item) => [item.community_code, item]));
    const batchCodes = new Map(batches.map((item) => [item.batch_code, item]));

    for (const community of communities) {
      await connection.query(
        'INSERT INTO communities (community_code, name, area) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), area = VALUES(area)',
        [community.community_code, community.name, community.area]
      );
    }

    for (const batch of batches) {
      const communityId = communityCodes.get(batch.community_code).community_code;
      const [communityRow] = await connection.query('SELECT id FROM communities WHERE community_code = ?', [batch.community_code]);
      await connection.query(
        'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE community_id = VALUES(community_id), name = VALUES(name), records = VALUES(records), progress = VALUES(progress), status = VALUES(status)',
        [batch.batch_code, communityRow[0].id, batch.name, batch.records, batch.progress, batch.status]
      );
    }

    for (const group of groups) {
      const [communityRow] = await connection.query('SELECT id FROM communities WHERE community_code = ?', [group.community_code]);
      await connection.query(
        'INSERT INTO groups (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE community_id = VALUES(community_id), name = VALUES(name), leader = VALUES(leader), members_count = VALUES(members_count), status = VALUES(status)',
        [group.group_code, communityRow[0].id, group.name, group.leader, group.members_count, group.status]
      );
    }

    for (const [groupCode, batchList] of Object.entries(groupBatchMap)) {
      const [groupRow] = await connection.query('SELECT id FROM groups WHERE group_code = ?', [groupCode]);
      if (!groupRow.length) continue;
      for (const batchCode of batchList) {
        const [batchRow] = await connection.query('SELECT id FROM batches WHERE batch_code = ?', [batchCode]);
        if (!batchRow.length) continue;
        await connection.query(
          'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE group_id = VALUES(group_id)',
          [groupRow[0].id, batchRow[0].id]
        );
      }
    }

    for (const mother of mothers) {
      const [communityRow] = await connection.query('SELECT id FROM communities WHERE community_code = ?', [mother.community_code]);
      const [groupRow] = await connection.query('SELECT id FROM groups WHERE group_code = ?', [mother.group_code]);
      const [batchRow] = await connection.query('SELECT id FROM batches WHERE batch_code = ?', [mother.batch_code]);

      await connection.query(
        `INSERT INTO mothers (
          mother_code, community_id, group_id, batch_id, first_name, middle_name, last_name, dob, lmp_date, edd_date,
          contact_number, is_high_risk, program_type, emergency_name, emergency_contact, emergency_relationship,
          spouse_name, address, prenatal_reg_date, trimester, gestational_age, prenatal_weight, prenatal_bp,
          prenatal_height, fundal_height, fhr, gravida, para, abortion, stillbirth, status, visits, progress
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
          community_id = VALUES(community_id), group_id = VALUES(group_id), batch_id = VALUES(batch_id),
          first_name = VALUES(first_name), middle_name = VALUES(middle_name), last_name = VALUES(last_name),
          dob = VALUES(dob), lmp_date = VALUES(lmp_date), edd_date = VALUES(edd_date),
          contact_number = VALUES(contact_number), is_high_risk = VALUES(is_high_risk),
          program_type = VALUES(program_type), emergency_name = VALUES(emergency_name),
          emergency_contact = VALUES(emergency_contact), emergency_relationship = VALUES(emergency_relationship),
          spouse_name = VALUES(spouse_name), address = VALUES(address), prenatal_reg_date = VALUES(prenatal_reg_date),
          trimester = VALUES(trimester), gestational_age = VALUES(gestational_age), prenatal_weight = VALUES(prenatal_weight),
          prenatal_bp = VALUES(prenatal_bp), prenatal_height = VALUES(prenatal_height), fundal_height = VALUES(fundal_height),
          fhr = VALUES(fhr), gravida = VALUES(gravida), para = VALUES(para), abortion = VALUES(abortion), stillbirth = VALUES(stillbirth),
          status = VALUES(status), visits = VALUES(visits), progress = VALUES(progress)`,
        [
          mother.mother_code,
          communityRow[0].id,
          groupRow[0]?.id || null,
          batchRow[0]?.id || null,
          mother.first_name,
          mother.middle_name,
          mother.last_name,
          mother.dob,
          mother.lmp_date,
          mother.edd_date,
          mother.contact_number,
          mother.is_high_risk,
          mother.program_type,
          mother.emergency_name,
          mother.emergency_contact,
          mother.emergency_relationship,
          mother.spouse_name,
          mother.address,
          mother.prenatal_reg_date,
          mother.trimester,
          mother.gestational_age,
          mother.prenatal_weight,
          mother.prenatal_bp,
          mother.prenatal_height,
          mother.fundal_height,
          mother.fhr,
          mother.gravida,
          mother.para,
          mother.abortion,
          mother.stillbirth,
          mother.status,
          mother.visits,
          mother.progress,
        ]
      );
    }

    console.log('Community sample data inserted successfully');
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Error seeding community data', error);
  process.exit(1);
});
