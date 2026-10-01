const { normalizeRole } = require('../middleware/auth');

function getNotificationScope(user) {
  const role = normalizeRole(user?.role);
  if (role === 'super_admin') {
    return {
      global: true,
      schoolId: null,
      superAdmin: true,
      categories: ['Community', 'User Management'],
    };
  }
  if (role === 'admin') return { global: true, schoolId: null, excludeUserManagement: true };
  if (role === 'community_coordinator') {
    return { global: false, schoolId: user.school_id || null, excludeUserManagement: true };
  }
  if (role === 'partner') {
    return { global: false, schoolId: user.school_id || null, excludeUserManagement: true };
  }
  if (role === 'health_worker') {
    return {
      global: false,
      schoolId: user.school_id || null,
      groupId: user.group_id || null,
      healthWorker: true,
    };
  }
  return null;
}

module.exports = { getNotificationScope };