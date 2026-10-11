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
  if (role === 'partner') return { global: true, schoolId: null, excludeUserManagement: true };
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

function getNotificationFilters(user, { category = '', search = '' } = {}) {
  const scope = getNotificationScope(user);
  if (!scope) return null;

  const filters = ['(n.recipient_user_ids IS NULL OR FIND_IN_SET(?, n.recipient_user_ids) > 0)'];
  const params = [String(user.id)];

  if (!scope.global) {
    if (!scope.schoolId) return { scope, where: '1 = 0', params: [] };
    filters.push('(n.school_id = ? OR FIND_IN_SET(?, n.school_scope_ids) > 0)');
    params.push(scope.schoolId, scope.schoolId);
  }
  if (scope.excludeUserManagement) {
    filters.push('n.category <> ?');
    params.push('User Management');
  }
  if (scope.categories) {
    filters.push(`n.category IN (${scope.categories.map(() => '?').join(', ')})`);
    params.push(...scope.categories);
    if (category && category !== 'All' && !scope.categories.includes(category)) {
      filters.push('1 = 0');
    }
  }
  if (scope.healthWorker) {
    filters.push('(n.category = ? OR FIND_IN_SET(?, n.recipient_user_ids) > 0)');
    params.push('Monitoring', String(user.id));
    if (scope.groupId) {
      filters.push('(n.group_id = ? OR n.group_id IS NULL)');
      params.push(scope.groupId);
    }
    if (category && category !== 'All' && category !== 'Monitoring' && category !== 'Beneficiaries') {
      filters.push('1 = 0');
    }
  }
  if (category && category !== 'All') {
    filters.push('n.category = ?');
    params.push(category);
  }
  if (search) {
    filters.push('(n.title LIKE ? OR n.message LIKE ? OR n.category LIKE ? OR actor.first_name LIKE ? OR actor.last_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  return { scope, where: filters.join(' AND '), params };
}

module.exports = { getNotificationScope, getNotificationFilters };