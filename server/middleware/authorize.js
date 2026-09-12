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

const permissionResponse = (res, message = 'Forbidden') => {
  const payload = {
    status: 403,
    code: 'PERMISSION_DENIED',
    message,
    timestamp: new Date().toISOString(),
  };
  return res.status(403).json(payload);
};

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const userRole = normalizeRole(req.user.role);
    const permitted = allowedRoles.some((role) => normalizeRole(role) === userRole);
    if (!permitted) {
      return permissionResponse(res, 'You do not have permission to access this resource');
    }

    return next();
  };
}

function authorizeOperational(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
  }

  const userRole = normalizeRole(req.user.role);
  const scopedRoles = ['admin', 'partner'];
  const hasSchoolAssignment = req.user.school_id !== undefined && req.user.school_id !== null && String(req.user.school_id).trim() !== '';

  if (userRole === 'super_admin') {
    req.schoolId = null;
    return next();
  }

  if (scopedRoles.includes(userRole)) {
    if (!hasSchoolAssignment) {
      return permissionResponse(res, 'This account is not assigned to a school');
    }
    req.schoolId = Number(req.user.school_id);
  } else {
    req.schoolId = null;
  }

  if (req.method === 'GET') {
    return next();
  }

  return permissionResponse(res, 'Operational modules are read-only for this role');
}

module.exports = { authorize, authorizeOperational, normalizeRole };