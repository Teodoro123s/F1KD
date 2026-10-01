const { createSuperadminNotification } = require('./notifications');

async function seedNotificationSamples(pool, actorUser = null) {
  const store = pool || require('../db');
  const [[superadmin]] = await store.query(
    `SELECT id FROM users
     WHERE LOWER(REPLACE(TRIM(role), ' ', '_')) IN ('super_admin', 'superadmin')
     ORDER BY id LIMIT 1`,
  );
  const actorUserId = actorUser?.id || superadmin?.id || null;

  // Resolve schools 1 and 2 if available, or fetch existing schools
  const [schools] = await store.query('SELECT id, name FROM communities ORDER BY id LIMIT 2');
  const school1 = schools[0] || { id: 1, name: 'Swu' };
  const school2 = schools[1] || { id: 2, name: 'Upang' };

  // Fetch groups
  const [groups] = await store.query('SELECT id, name, community_id FROM groups ORDER BY id LIMIT 4');
  const group1 = groups.find((g) => g.community_id === school1.id) || groups[0] || { id: 1, name: 'Sambag-I' };
  const group2 = groups.find((g) => g.community_id === school2.id) || groups[1] || { id: 3, name: 'Hermes' };

  // Fetch mothers and children if existing
  const [mothers] = await store.query('SELECT id, mother_code, first_name, last_name, community_id, group_id FROM mothers ORDER BY id LIMIT 3');
  const m1 = mothers[0] || { id: 1, mother_code: 'MOT-001', first_name: 'Cathy', last_name: 'Parmacy', community_id: school1.id, group_id: group1.id };
  const m2 = mothers[1] || { id: 2, mother_code: 'MOT-002', first_name: 'Lila', last_name: 'Ikaw', community_id: school2.id, group_id: group2.id };

  const [children] = await store.query('SELECT id, child_code, first_name, last_name, community_id, group_id FROM children ORDER BY id LIMIT 3');
  const c1 = children[0] || { id: 1, child_code: 'CHD-001', first_name: 'Kito', last_name: 'Ikaw', community_id: school2.id, group_id: group2.id };
  const c2 = children[1] || { id: 2, child_code: 'CHD-002', first_name: 'Jerry', last_name: 'Jaborno', community_id: school2.id, group_id: group2.id };

  const [programs] = await store.query('SELECT id, name, beneficiary_type FROM programs ORDER BY id LIMIT 2');
  const p1 = programs[0] || { id: 2, name: 'Monthly Meeting & Health Education', beneficiary_type: 'Mother' };
  const p2 = programs[1] || { id: 4, name: 'First 1000 Days Milk Subsidy', beneficiary_type: 'Child' };

  const now = Date.now();
  const minutesAgo = (m) => new Date(now - m * 60 * 1000);
  const hoursAgo = (h) => new Date(now - h * 3600 * 1000);
  const daysAgo = (d) => new Date(now - d * 86400 * 1000);

  const sampleEvents = [
    // 1. Beneficiary - Child check-up saved (recent)
    {
      eventType: 'monitoring.child.checkup_saved',
      category: 'Monitoring',
      title: 'Child check-up saved',
      message: `Week 8 pediatric check-up for ${c1.first_name} ${c1.last_name} was saved. Normal growth trajectory recorded.`,
      entityType: 'child',
      entityId: c1.id,
      linkTo: `/beneficiary/child/${c1.child_code || c1.id}/profile`,
      schoolId: school2.id,
      groupId: group2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: minutesAgo(5),
    },
    // 2. Beneficiary - Mother check-up saved
    {
      eventType: 'monitoring.mother.checkup_saved',
      category: 'Monitoring',
      title: 'Mother check-up saved',
      message: `2nd Trimester check-up for ${m1.first_name} ${m1.last_name} was saved. BP 110/70, fundal height normal.`,
      entityType: 'mother',
      entityId: m1.id,
      linkTo: `/beneficiary/mother/${m1.mother_code || m1.id}/monitoring`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: minutesAgo(18),
    },
    // 3. Program - Beneficiary monitoring attendance updated
    {
      eventType: 'program.monitoring_updated',
      category: 'Monitoring',
      title: 'Program monitoring updated',
      message: `Monitoring for ${m1.first_name} ${m1.last_name} in ${p1.name} was completed. Milk subsidy distributed.`,
      entityType: 'program',
      entityId: p1.id,
      linkTo: `/program/${p1.id}`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: minutesAgo(35),
    },
    // 4. Beneficiary - Child transferred across groups/schools
    {
      eventType: 'beneficiary.child.transferred',
      category: 'Beneficiaries',
      title: 'Child assignment changed',
      message: `${c2.first_name} ${c2.last_name} was transferred to ${school1.name} (${group1.name}) group.`,
      entityType: 'child',
      entityId: c2.id,
      linkTo: `/beneficiary/child/${c2.child_code || c2.id}/profile`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(1),
    },
    // 5. Beneficiary - Child created
    {
      eventType: 'beneficiary.child.created',
      category: 'Beneficiaries',
      title: 'Child created',
      message: `${c1.first_name} ${c1.last_name} was enrolled as a new child beneficiary.`,
      entityType: 'child',
      entityId: c1.id,
      linkTo: `/beneficiary/child/${c1.child_code || c1.id}/profile`,
      schoolId: school2.id,
      groupId: group2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(2),
    },
    // 6. Beneficiary - Child updated
    {
      eventType: 'beneficiary.child.updated',
      category: 'Beneficiaries',
      title: 'Child updated',
      message: `${c1.first_name} ${c1.last_name}'s birth weight and immunization details were updated.`,
      entityType: 'child',
      entityId: c1.id,
      linkTo: `/beneficiary/child/${c1.child_code || c1.id}/profile`,
      schoolId: school2.id,
      groupId: group2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(3),
    },
    // 7. Beneficiary - Child document uploaded
    {
      eventType: 'beneficiary.child.document_uploaded',
      category: 'Beneficiaries',
      title: 'Child document uploaded',
      message: `A PSA Live Birth certificate was uploaded for ${c1.first_name} ${c1.last_name}.`,
      entityType: 'child',
      entityId: c1.id,
      linkTo: `/beneficiary/child/${c1.child_code || c1.id}/profile`,
      schoolId: school2.id,
      groupId: group2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(4),
    },
    // 8. Beneficiary - Child deleted
    {
      eventType: 'beneficiary.child.deleted',
      category: 'Beneficiaries',
      title: 'Child deleted',
      message: `Child beneficiary Baby Garcia was removed from records following relocation.`,
      entityType: 'child',
      entityId: 994,
      linkTo: '/beneficiary',
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(5),
    },
    // 9. Beneficiary - Mother created
    {
      eventType: 'beneficiary.mother.created',
      category: 'Beneficiaries',
      title: 'Mother created',
      message: `${m1.first_name} ${m1.last_name} was registered into First 1000 Days Maternal Program.`,
      entityType: 'mother',
      entityId: m1.id,
      linkTo: `/beneficiary/mother/${m1.mother_code || m1.id}`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(6),
    },
    // 10. Beneficiary - Mother updated
    {
      eventType: 'beneficiary.mother.updated',
      category: 'Beneficiaries',
      title: 'Mother updated',
      message: `${m2.first_name} ${m2.last_name}'s contact number and prenatal status were updated.`,
      entityType: 'mother',
      entityId: m2.id,
      linkTo: `/beneficiary/mother/${m2.mother_code || m2.id}`,
      schoolId: school2.id,
      groupId: group2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(8),
    },
    // 11. Beneficiary - Mother transferred
    {
      eventType: 'beneficiary.mother.transferred',
      category: 'Beneficiaries',
      title: 'Mother assignment changed',
      message: `${m2.first_name} ${m2.last_name} was transferred to ${school2.name} (${group2.name}).`,
      entityType: 'mother',
      entityId: m2.id,
      linkTo: `/beneficiary/mother/${m2.mother_code || m2.id}`,
      schoolId: school2.id,
      groupId: group2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(10),
    },
    // 12. Beneficiary - Mother document uploaded
    {
      eventType: 'beneficiary.mother.document_uploaded',
      category: 'Beneficiaries',
      title: 'Mother document uploaded',
      message: `Signed program consent and PhilHealth ID were uploaded for ${m1.first_name} ${m1.last_name}.`,
      entityType: 'mother',
      entityId: m1.id,
      linkTo: `/beneficiary/mother/${m1.mother_code || m1.id}`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(12),
    },
    // 13. Beneficiary - Mother document removed
    {
      eventType: 'beneficiary.mother.document_deleted',
      category: 'Beneficiaries',
      title: 'Mother document removed',
      message: `Outdated PhilHealth verification document was removed for ${m2.first_name} ${m2.last_name}.`,
      entityType: 'mother',
      entityId: m2.id,
      linkTo: `/beneficiary/mother/${m2.mother_code || m2.id}`,
      schoolId: school2.id,
      groupId: group2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(14),
    },
    // 14. Beneficiary - Mother deleted
    {
      eventType: 'beneficiary.mother.deleted',
      category: 'Beneficiaries',
      title: 'Mother deleted',
      message: `Sample Mother Archive and 1 associated child record(s) were removed from beneficiaries.`,
      entityType: 'mother',
      entityId: 993,
      linkTo: '/beneficiary',
      schoolId: school2.id,
      groupId: group2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: hoursAgo(16),
    },
    // 15. Program - Program created
    {
      eventType: 'program.created',
      category: 'Programs',
      title: 'Program created',
      message: `Program "${p2.name}" was created by Community Coordinator.`,
      entityType: 'program',
      entityId: p2.id,
      linkTo: `/program/${p2.id}`,
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(1),
    },
    // 16. Program - Scopes / Beneficiary clusters assigned
    {
      eventType: 'program.scopes_assigned',
      category: 'Programs',
      title: 'Program beneficiaries assigned',
      message: `2 school/group/batch clusters were assigned to ${p2.name} (Coverage: 50 beneficiaries).`,
      entityType: 'program',
      entityId: p2.id,
      linkTo: `/program/${p2.id}`,
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(1),
    },
    // 17. Program - Beneficiary cluster quota edited / transferred
    {
      eventType: 'program.cluster_updated',
      category: 'Programs',
      title: 'Program beneficiaries updated',
      message: `Group ${group1.name} beneficiary quota was updated to 30 for ${p2.name}.`,
      entityType: 'program',
      entityId: p2.id,
      linkTo: `/program/${p2.id}`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(2),
    },
    // 18. Program - Cluster scope completed
    {
      eventType: 'program.cluster_completed',
      category: 'Programs',
      title: 'Program scope completed',
      message: `Group ${group1.name} completed 100% of milk and vitamin distributions for ${p2.name}.`,
      entityType: 'program',
      entityId: p2.id,
      linkTo: `/program/${p2.id}`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(2),
    },
    // 19. Program - Program updated
    {
      eventType: 'program.updated',
      category: 'Programs',
      title: 'Program updated',
      message: `Program "${p1.name}" schedule, provider, and target counts were updated.`,
      entityType: 'program',
      entityId: p1.id,
      linkTo: `/program/${p1.id}`,
      schoolId: school2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(3),
    },
    // 20. Program - Program ended & restored
    {
      eventType: 'program.ended',
      category: 'Programs',
      title: 'Program ended',
      message: `Program "${p1.name}" was marked as ended after completing scheduled cycle.`,
      entityType: 'program',
      entityId: p1.id,
      linkTo: `/program/${p1.id}`,
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(4),
    },
    {
      eventType: 'program.restored',
      category: 'Programs',
      title: 'Program restored',
      message: `Program "${p1.name}" was restored to Active status for extension phase.`,
      entityType: 'program',
      entityId: p1.id,
      linkTo: `/program/${p1.id}`,
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(4),
    },
    // 21. Community Organizer user created
    {
      eventType: 'user.created',
      category: 'User Management',
      title: 'Community Organizer created',
      message: `User account created: Maria Santos (Community Organizer) assigned to ${school1.name}.`,
      entityType: 'user',
      entityId: 2,
      linkTo: `/user-management/user/2`,
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(5),
    },
    // 22. Community Organizer assigned to School
    {
      eventType: 'coordinator.assigned',
      category: 'Community',
      title: 'Community Organizer assigned',
      message: `Community Organizer Maria Santos was assigned as the lead coordinator for ${school1.name}.`,
      entityType: 'school',
      entityId: school1.id,
      linkTo: `/community/school/${school1.id}`,
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(5),
    },
    // 23. Community Organizer user access updated / transferred
    {
      eventType: 'user.access_updated',
      category: 'User Management',
      title: 'Community Organizer access updated',
      message: `Access updated for Community Organizer Juan Dela Cruz: assigned to ${school2.name}.`,
      entityType: 'user',
      entityId: 3,
      linkTo: `/user-management/user/3`,
      schoolId: school2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(6),
    },
    // 24. Community Organizer suspended & reactivated
    {
      eventType: 'user.suspended',
      category: 'User Management',
      title: 'User suspended',
      message: `User account suspended: Community Organizer Juan Dela Cruz.`,
      entityType: 'user',
      entityId: 3,
      linkTo: `/user-management/user/3`,
      schoolId: school2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(7),
    },
    {
      eventType: 'user.reactivated',
      category: 'User Management',
      title: 'User reactivated',
      message: `User account reactivated: Community Organizer Juan Dela Cruz.`,
      entityType: 'user',
      entityId: 3,
      linkTo: `/user-management/user/3`,
      schoolId: school2.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(7),
    },
    // 25. Community Organizer user deleted
    {
      eventType: 'user.deleted',
      category: 'User Management',
      title: 'User deleted',
      message: `User account deleted: Temporary Community Organizer account.`,
      entityType: 'user',
      entityId: 991,
      linkTo: '/user-management',
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(8),
    },
    // 26. Community School created, updated
    {
      eventType: 'school.created',
      category: 'Community',
      title: 'School created',
      message: `School created: ${school1.name} under area Poblacion.`,
      entityType: 'school',
      entityId: school1.id,
      linkTo: `/community/school/${school1.id}`,
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(9),
    },
    {
      eventType: 'school.updated',
      category: 'Community',
      title: 'School updated',
      message: `School updated: ${school1.name} facility contact info and coordinator refreshed.`,
      entityType: 'school',
      entityId: school1.id,
      linkTo: `/community/school/${school1.id}`,
      schoolId: school1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(9),
    },
    // 27. Community Group created, updated
    {
      eventType: 'group.created',
      category: 'Community',
      title: 'Group created',
      message: `Group created: ${group1.name} under ${school1.name}.`,
      entityType: 'group',
      entityId: group1.id,
      linkTo: `/community/group/${group1.id}`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(10),
    },
    {
      eventType: 'group.updated',
      category: 'Community',
      title: 'Group updated',
      message: `Group updated: ${group1.name} leader assignment and member count updated.`,
      entityType: 'group',
      entityId: group1.id,
      linkTo: `/community/group/${group1.id}`,
      schoolId: school1.id,
      groupId: group1.id,
      schoolIds: [school1.id, school2.id],
      createdAt: daysAgo(10),
    },
  ];

  for (const event of sampleEvents) {
    await createSuperadminNotification({
      ...event,
      actorUserId,
    }, store);
  }

  return { count: sampleEvents.length };
}

module.exports = { seedNotificationSamples };
