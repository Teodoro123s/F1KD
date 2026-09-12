const pool = require('../db');

const PROGRAM_DEFINITIONS = [
  { name: 'Community Nutrition Support', type: 'Feeding', provider: 'Municipal Health Office', description: 'Nutrition support for beneficiaries in the community hierarchy.', beneficiaryType: 'Mother and Child' },
  { name: 'Maternal Wellness Assistance', type: 'Milk Subsidy', provider: 'Local Community Program', description: 'Maternal wellness assistance for mothers registered in the community.', beneficiaryType: 'Mother' },
];

async function findOrCreateProgram(connection, definition) {
  const [existing] = await connection.query('SELECT id FROM programs WHERE name = ? AND provider = ? LIMIT 1', [definition.name, definition.provider]);
  if (existing.length) return existing[0].id;
  const [result] = await connection.query(
    'INSERT INTO programs (name, type, provider, description, beneficiary_type) VALUES (?, ?, ?, ?, ?)',
    [definition.name, definition.type, definition.provider, definition.description, definition.beneficiaryType],
  );
  return result.insertId;
}

async function upsertCluster(connection, programId, type, name, beneficiaries, received) {
  await connection.query(
    `INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE beneficiaries = VALUES(beneficiaries), received = VALUES(received)`,
    [programId, type, name, beneficiaries, received],
  );
}

async function seedProgramMonitoring(connection, programId, mothers, children) {
  const date = new Date().toISOString().slice(0, 10);
  const recipients = [...mothers.map(({ id }) => ({ id, type: 'mother' })), ...children.map(({ id }) => ({ id, type: 'child' }))];
  for (const [index, recipient] of recipients.entries()) {
    await connection.query(
      `INSERT INTO monitoring_logs (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), notes = VALUES(notes)`,
      [recipient.id, recipient.type, programId, index % 3 !== 0, date, 'Seeded program monitoring record'],
    );
  }
}

async function seed() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [communities] = await connection.query('SELECT id, name FROM communities ORDER BY id');
    const [groups] = await connection.query('SELECT id, name, community_id FROM groups ORDER BY id');
    const [batches] = await connection.query('SELECT id, name, batch_code, community_id FROM batches ORDER BY id');
    const [mothers] = await connection.query('SELECT id, community_id, group_id, batch_id FROM mothers ORDER BY id');
    const [children] = await connection.query('SELECT id, community_id, group_id, batch_id FROM children ORDER BY id');
    if (!communities.length) throw new Error('Communities must be seeded before program data.');

    const seededPrograms = [];
    for (const definition of PROGRAM_DEFINITIONS) {
      const programId = await findOrCreateProgram(connection, definition);
      let programTarget = 0;
      let programReceived = 0;

      for (const community of communities) {
        const communityGroups = groups.filter((group) => Number(group.community_id) === Number(community.id));
        const communityBatches = batches.filter((batch) => Number(batch.community_id) === Number(community.id));
        const communityMothers = mothers.filter((mother) => Number(mother.community_id) === Number(community.id));
        const communityChildren = children.filter((child) => Number(child.community_id) === Number(community.id));
        const count = definition.beneficiaryType === 'Mother' ? communityMothers.length : communityMothers.length + communityChildren.length;
        const received = Math.round(count * 0.7);

        await upsertCluster(connection, programId, 'School', community.name, count, received);
        programTarget += count;
        programReceived += received;

        for (const group of communityGroups) {
          const groupMothers = communityMothers.filter((mother) => Number(mother.group_id) === Number(group.id));
          const groupChildren = communityChildren.filter((child) => Number(child.group_id) === Number(group.id));
          const groupCount = definition.beneficiaryType === 'Mother' ? groupMothers.length : groupMothers.length + groupChildren.length;
          await upsertCluster(connection, programId, 'Group', group.name, groupCount, Math.round(groupCount * 0.7));
        }

        for (const batch of communityBatches) {
          const batchMothers = communityMothers.filter((mother) => Number(mother.batch_id) === Number(batch.id));
          const batchChildren = communityChildren.filter((child) => Number(child.batch_id) === Number(batch.id));
          const batchCount = definition.beneficiaryType === 'Mother' ? batchMothers.length : batchMothers.length + batchChildren.length;
          await upsertCluster(connection, programId, 'Batch', batch.name || batch.batch_code, batchCount, Math.round(batchCount * 0.7));
        }
      }

      await connection.query('UPDATE programs SET target = ?, received = ?, activities = ?, latest = CURRENT_DATE WHERE id = ?', [programTarget, programReceived, communities.length, programId]);
      await seedProgramMonitoring(connection, programId, mothers, definition.beneficiaryType === 'Mother' ? [] : children);
      seededPrograms.push({ id: programId, name: definition.name, target: programTarget, received: programReceived });
    }

    await connection.commit();
    console.log('Program seed complete:', seededPrograms);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Program seed failed:', error.message);
  process.exitCode = 1;
});
