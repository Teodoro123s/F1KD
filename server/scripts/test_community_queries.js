const pool = require('../db');

(async ()=>{
  try{
    console.log('Running community summary SQL checks');

    const communitiesSql = `
      SELECT
        c.community_code AS id,
        c.name,
        c.area,
        COUNT(DISTINCT b.id) AS batches,
        COUNT(DISTINCT m.id) AS records
      FROM communities c
      LEFT JOIN batches b ON b.community_id = c.id
      LEFT JOIN mothers m ON m.community_id = c.id
      GROUP BY c.id, c.community_code, c.name, c.area
      ORDER BY c.id
    `;

    const batchesSql = `
      SELECT
        b.batch_code AS id,
        b.name,
        c.name AS community,
        b.records,
        b.progress,
        b.status
      FROM batches b
      JOIN communities c ON c.id = b.community_id
      ORDER BY b.id
    `;

    const groupsSql = `
      SELECT
        g.group_code AS id,
        g.name,
        c.name AS community,
        g.leader,
        g.members_count AS members,
        g.status,
        GROUP_CONCAT(DISTINCT b.batch_code ORDER BY b.batch_code SEPARATOR ',') AS assignedBatchIds,
        COUNT(DISTINCT b.id) AS batches
      FROM groups g
      JOIN communities c ON c.id = g.community_id
      LEFT JOIN group_batch gb ON gb.group_id = g.id
      LEFT JOIN batches b ON b.id = gb.batch_id
      GROUP BY g.id, g.group_code, g.name, c.name, g.leader, g.members_count, g.status
      ORDER BY g.id
    `;

    const mothersSql = `
      SELECT
        m.mother_code AS id,
        CONCAT(m.first_name, ' ', IFNULL(m.middle_name, ''), ' ', m.last_name) AS name,
        b.batch_code AS batchId,
        g.name AS groupName,
        m.status,
        m.visits
      FROM mothers m
      LEFT JOIN batches b ON b.id = m.batch_id
      LEFT JOIN groups g ON g.id = m.group_id
      ORDER BY m.id
    `;

    const [communities] = await pool.query(communitiesSql);
    console.log('communities rows:', communities.length);
    const [batches] = await pool.query(batchesSql);
    console.log('batches rows:', batches.length);
    const [groupRows] = await pool.query(groupsSql);
    console.log('groups rows:', groupRows.length);
    const [motherRows] = await pool.query(mothersSql);
    console.log('mothers rows:', motherRows.length);

    await pool.end();
  }catch(e){ console.error('SQL_ERR', e); try{ await pool.end(); }catch{} process.exit(1);} 
})();
