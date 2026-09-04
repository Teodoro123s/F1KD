const ROLE_ALIASES = {
  superadmin: 'super_admin',
  'super admin': 'super_admin',
  administrator: 'admin',
  admin: 'admin',
  'community organizer': 'partner',
  communityorganizer: 'partner',
  partner: 'partner',
  'health worker': 'partner',
  healthworker: 'partner',
};

const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase();
  return ROLE_ALIASES[value] || value;
};

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

    const userRole = normalizeRole(req.user.role);
    const permitted = allowedRoles.some((role) => normalizeRole(role) === userRole);
    if (!permitted) return res.status(403).json({ error: 'Forbidden' });

    return next();
  };
}

function authorizeOperational(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

  const userRole = normalizeRole(req.user.role);
  const scopedRole = userRole === 'partner';
  const hasSchoolAssignment = req.user.school_id !== undefined && req.user.school_id !== null && String(req.user.school_id).trim() !== '';

  req.schoolId = hasSchoolAssignment ? Number(req.user.school_id) : null;

  if (req.method === 'GET' || userRole === 'super_admin') {
    return next();
  }

  if (scopedRole && !hasSchoolAssignment) {
    return res.status(403).json({ error: 'No school is assigned to this account' });
  }

  return res.status(403).json({ error: 'Operational modules are read-only for this role' });
}

module.exports = { authorize, authorizeOperational, normalizeRole };