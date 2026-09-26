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

const isHealthWorkerRole = (role) => ['health worker', 'healthworker'].includes(String(role || '').trim().toLowerCase());
const isCommunityOrganizerRole = (role) => ['community organizer', 'communityorganizer'].includes(String(role || '').trim().toLowerCase());

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
  const isCommunityOrganizer = isCommunityOrganizerRole(req.user.role);
  const isCommunityOrganizerCreate = userRole === 'partner'
    && isCommunityOrganizer
    && req.method === 'POST'
    && (
      (['/api/mothers', '/api/children'].includes(req.baseUrl) && req.path === '/')
      || (req.baseUrl === '/api/community' && ['/batches', '/groups'].includes(req.path))
    );
  const isBeneficiaryUpdate = ['admin', 'partner'].includes(userRole)
    && req.baseUrl === '/api/mothers'
    && (
      (req.method === 'PUT' && /^\/[^/]+\/?$/.test(req.path))
      || (req.method === 'POST' && /^\/[^/]+\/(documents|checkups)\/?$/.test(req.path))
    );
  const isChildCheckupUpdate = ['admin', 'partner'].includes(userRole)
    && req.baseUrl === '/api/children'
    && req.method === 'POST'
    && /^\/[^/]+\/checkups\/?$/.test(req.path);
  const isCommunityOrganizerProgramCreate = userRole === 'partner'
    && isCommunityOrganizer
    && req.baseUrl === '/api/programs'
    && req.method === 'POST'
    && (req.path === '/' || /^\/[^/]+\/clusters\/?$/.test(req.path));
  if (userRole !== 'super_admin' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isCommunityOrganizerCreate && !isBeneficiaryUpdate && !isChildCheckupUpdate && !isCommunityOrganizerProgramCreate) {
    return permissionResponse(res, 'Admin and Partner accounts are read-only');
  }
  req.isHealthWorker = isHealthWorkerRole(req.user.role);
  req.isCommunityOrganizer = isCommunityOrganizer;
  const scopedRoles = ['partner'];
  const hasSchoolAssignment = req.user.school_id !== undefined && req.user.school_id !== null && String(req.user.school_id).trim() !== '';
  const hasGroupAssignment = req.user.group_id !== undefined && req.user.group_id !== null && String(req.user.group_id).trim() !== '';

  if (userRole === 'super_admin') {
    req.schoolId = null;
    req.groupId = null;
    return next();
  }

  if (scopedRoles.includes(userRole)) {
    if (!hasSchoolAssignment) {
      if (isCommunityOrganizerRole(req.user.role)) {
        req.schoolId = -1;
        req.groupId = null;
        return next();
      }
      return permissionResponse(res, 'This account is not assigned to a school');
    }
    req.schoolId = Number(req.user.school_id);
    req.groupId = req.isHealthWorker && hasGroupAssignment ? Number(req.user.group_id) : null;
  } else {
    req.schoolId = null;
    req.groupId = null;
  }

  return next();
}

module.exports = { authorize, authorizeOperational, normalizeRole, isHealthWorkerRole };