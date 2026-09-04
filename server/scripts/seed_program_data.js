const pool = require('../db');

async function seed() {
  const programs = [
    {
      name: 'Community Nutrition Support',
      type: 'Feeding',
      provider: 'Municipal Health Office',
      description: 'Nutrition support for selected community beneficiaries.',
      beneficiaryType: 'Mother and Child',
      clusters: [
        { type: 'School', name: 'Poblacion', beneficiaries: 3 },
        { type: 'Group', name: 'Poblacion Elementary School', beneficiaries: 2 },
      ],
    },
    {
      name: 'Maternal Wellness Assistance',
      type: 'Milk Subsidy',
      provider: 'Local Community Program',
      description: 'Support for mothers enrolled in maternal wellness services.',
      beneficiaryType: 'Mother',
      clusters: [
        { type: 'School', name: 'San Roque', beneficiaries: 2 },
      ],
    },
  ];

  for (const program of programs) {
    const [result] = await pool.query(
      `INSERT INTO programs (name, type, provider, description, beneficiary_type)
       SELECT ?, ?, ?, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM programs WHERE name = ? AND provider = ?)` ,
      [program.name, program.type, program.provider, program.description, program.beneficiaryType, program.name, program.provider],
    );
    if (!result.insertId) continue;
    for (const cluster of program.clusters) {
      await pool.query(
        'INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries) VALUES (?, ?, ?, ?)',
        [result.insertId, cluster.type, cluster.name, cluster.beneficiaries],
      );
    }
  }

  const [rows] = await pool.query('SELECT id, name, provider FROM programs ORDER BY id');
  console.log('Program seed complete:', rows);
  await pool.end();
}

seed().catch(async (error) => {
  console.error('Program seed failed:', error.message);
  await pool.end();
  process.exit(1);
});
