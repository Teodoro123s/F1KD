const ROLE_ALIASES = {
  superadmin: 'super_admin',
  'super admin': 'super_admin',
  super_admin: 'super_admin',
  administrator: 'admin',
  admin: 'admin',
  'community organizer': 'community_coordinator',
  communityorganizer: 'community_coordinator',
  'community coordinator': 'community_coordinator',
  community_coordinator: 'community_coordinator',
  communitycoordinator: 'community_coordinator',
  coordinator: 'community_coordinator',
  co: 'community_coordinator',
  partner: 'partner',
  'health worker': 'health_worker',
  healthworker: 'health_worker',
  health_worker: 'health_worker',
};

const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase();
  return ROLE_ALIASES[value] || value;
};

const isHealthWorkerRole = (role) => normalizeRole(role) === 'health_worker';
const isCommunityCoordinatorRole = (role) => normalizeRole(role) === 'community_coordinator';

const permissionResponse = (res, message = 'Forbidden') => {
  const payload = {
    status: 403,
    code: 'PERMISSION_DENIED',
    message,
    timestamp: new Date().toISOString(),
  };
  return res.status(403).json(payload);
};

const isReadMethod = (method) => ['GET', 'HEAD', 'OPTIONS'].includes(method);

const isUsersRequest = (req) => req.baseUrl === '/api/users';

const isSchoolCreate = (req) => (
  req.baseUrl === '/api/community'
  && req.method === 'POST'
  && /^\/communities\/?$/.test(req.path)
);

const isSchoolDelete = (req) => (
  req.baseUrl === '/api/community'
  && req.method === 'DELETE'
  && /^\/communities\/[^/]+\/?$/.test(req.path)
);

const isLimitedWrite = (req) => {
  if (req.baseUrl === '/api/mothers') {
    return (req.method === 'PUT' && /^\/[^/]+\/?$/.test(req.path))
      || (req.method === 'POST' && /^\/[^/]+\/(documents|checkups)\/?$/.test(req.path));
  }
  if (req.baseUrl === '/api/children') {
    return req.method === 'POST' && /^\/[^/]+\/checkups\/?$/.test(req.path);
  }
  if (req.baseUrl === '/api/programs') {
    return req.method === 'PATCH' && /\/monitoring\/?$/.test(req.path);
  }
  return false;
};

const isHealthWorkerChildUpdate = (req) => (
  req.baseUrl === '/api/children'
  && req.method === 'PUT'
  && /^\/[^/]+\/?$/.test(req.path)
);

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
  const isCommunityOrganizer = isCommunityCoordinatorRole(req.user.role);
  req.isHealthWorker = isHealthWorkerRole(req.user.role);
  req.isCommunityOrganizer = isCommunityOrganizer;

  if (!isReadMethod(req.method)) {
    if (userRole !== 'super_admin' && isUsersRequest(req)) {
      return permissionResponse(res, 'User management is restricted to Superadmin');
    }

    if (userRole === 'community_coordinator' && (isSchoolCreate(req) || isSchoolDelete(req))) {
      return permissionResponse(res, 'Community Coordinators cannot create or delete schools');
    }

    const isAllowedHealthWorkerUpdate = userRole === 'health_worker' && isHealthWorkerChildUpdate(req);
    if (!['super_admin', 'community_coordinator'].includes(userRole) && !isLimitedWrite(req) && !isAllowedHealthWorkerUpdate) {
      return permissionResponse(res, 'Admin and Partner accounts are read-only');
    }
  }

  const scopedRoles = ['community_coordinator', 'partner', 'health_worker'];
  const hasSchoolAssignment = req.user.school_id !== undefined && req.user.school_id !== null && String(req.user.school_id).trim() !== '';
  const hasGroupAssignment = req.user.group_id !== undefined && req.user.group_id !== null && String(req.user.group_id).trim() !== '';

  if (userRole === 'super_admin') {
    req.schoolId = null;
    req.groupId = null;
    return next();
  }

  if (scopedRoles.includes(userRole)) {
    if (!hasSchoolAssignment) {
      if (isCommunityOrganizer) {
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

function authorizeProgressReport(req, res, next) {
  const userRole = normalizeRole(req.user?.role);
  if (userRole === 'admin' || userRole === 'partner') {
    return permissionResponse(res, 'Admin and Partner accounts cannot access progress reports');
  }
  return next();
}

module.exports = {
  authorize,
  authorizeOperational,
  authorizeProgressReport,
  normalizeRole,
  isHealthWorkerRole,
  isCommunityCoordinatorRole,
};
