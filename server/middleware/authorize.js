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

const MODULE_ROLES = {
  '/api/community': ['super_admin', 'admin', 'community_coordinator'],
  '/api/mothers': ['admin', 'community_coordinator', 'health_worker'],
  '/api/children': ['admin', 'community_coordinator', 'health_worker'],
  '/api/documents': ['admin', 'community_coordinator', 'health_worker'],
  '/api/programs': ['admin', 'community_coordinator', 'partner'],
  '/api/progress-report': ['community_coordinator', 'partner'],
};

const MOTHER_HEALTH_FIELDS = [
  'lmpDate', 'lmp_date', 'eddDate', 'edd_date', 'prenatalRegDate', 'prenatal_reg_date',
  'trimester', 'gestationalAge', 'gestational_age', 'prenatalWeight', 'prenatal_weight',
  'prenatalBp', 'prenatal_bp', 'prenatalHeight', 'prenatal_height', 'fundalHeight',
  'fundal_height', 'fhr', 'gravida', 'para', 'abortion', 'stillbirth', 'weight', 'height',
  'isHighRisk', 'is_high_risk', 'medicalConditions', 'medical_conditions',
  'otherMedicalHistory', 'other_medical_history', 'obHistory',
  'ttRemarks', 'tt1Date', 'tt2Date', 'tt3Date', 'tt4Date', 'tt5Date',
  'tt1Remarks', 'tt2Remarks', 'tt3Remarks', 'tt4Remarks', 'tt5Remarks',
  'dentalCheckupDate', 'dentalFacility', 'dentistInCharge', 'communityDentist',
  'dentistLicense', 'dentistContact', 'teethCount', 'dentalFindings', 'dentalRemarks',
  'dentalWork',
];
const CHILD_HEALTH_FIELDS = [
  'birthWeight', 'birth_weight', 'birthLength', 'birth_length', 'bloodType', 'blood_type',
  'noOfChildDelivered', 'no_of_child_delivered', 'multipleBirthType', 'multiple_birth_type',
  'exclusiveBreastfeeding', 'exclusive_breastfeeding', 'expandedNewbornScreening',
  'expanded_newborn_screening', 'expandedNewbornScreeningResult',
  'expanded_newborn_screening_result', 'deliveryType', 'delivery_type', 'healthStatus',
  'health_status', 'birthPlace', 'birth_place', 'birthAttendant', 'birth_attendant',
  'apgarScore', 'apgar_score', 'feedingType', 'feeding_type', 'nutritionNotes',
  'nutrition_notes', 'medicalConditions', 'medical_conditions',
  'bcgDate', 'bcgDose1', 'bcgDose2', 'bcgDose3', 'bcgRemarks',
  'hepbDate', 'hepbDose1', 'hepbDose2', 'hepbDose3', 'hepbRemarks',
  'opvDate', 'opvDose1', 'opvDose2', 'opvDose3', 'opvRemarks',
  'dptDate', 'dptDose1', 'dptDose2', 'dptDose3', 'dptRemarks',
  'mmrDate', 'mmrDose1', 'mmrDose2', 'mmrDose3', 'mmrRemarks',
];

function retainHealthFields(body, allowedFields) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  return Object.fromEntries(allowedFields
    .filter((field) => Object.prototype.hasOwnProperty.call(source, field))
    .map((field) => [field, source[field]]));
}

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

const isSchoolUpdate = (req) => (
  req.baseUrl === '/api/community'
  && req.method === 'PUT'
  && /^\/communities\/[^/]+\/?$/.test(req.path)
);

const isLimitedWrite = (req) => {
  if (req.baseUrl === '/api/mothers') {
    return (req.method === 'PUT' && /^\/[^/]+\/?$/.test(req.path))
      || (req.method === 'POST' && /^\/[^/]+\/checkups\/?$/.test(req.path));
  }
  if (req.baseUrl === '/api/children') {
    return req.method === 'POST' && /^\/[^/]+\/checkups\/?$/.test(req.path);
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
  const moduleRoles = MODULE_ROLES[req.baseUrl];
  if (!moduleRoles || !moduleRoles.includes(userRole)) {
    return permissionResponse(res, 'You do not have permission to access this resource');
  }
  const isCommunityOrganizer = isCommunityCoordinatorRole(req.user.role);
  req.isHealthWorker = isHealthWorkerRole(req.user.role);
  req.isCommunityOrganizer = isCommunityOrganizer;
  req.isPartner = userRole === 'partner';

  if (!isReadMethod(req.method)) {
    if (req.baseUrl === '/api/progress-report') {
      return permissionResponse(res, 'Progress reports are read-only');
    }
    if (userRole === 'community_coordinator' && req.baseUrl === '/api/community'
      && (isSchoolCreate(req) || isSchoolUpdate(req) || isSchoolDelete(req))) {
      return permissionResponse(res, 'Community Coordinators cannot create, update, or delete schools');
    }

    const isAllowedHealthWorkerWrite = userRole === 'health_worker'
      && req.baseUrl !== '/api/programs'
      && (isLimitedWrite(req) || isHealthWorkerChildUpdate(req));
    if (userRole !== 'super_admin'
      && userRole !== 'community_coordinator'
      && !isAllowedHealthWorkerWrite) {
      return permissionResponse(res, 'This role has read-only access to this module');
    }
  }

  const hasSchoolAssignment = req.user.school_id !== undefined && req.user.school_id !== null && String(req.user.school_id).trim() !== '';
  const hasGroupAssignment = req.user.group_id !== undefined && req.user.group_id !== null && String(req.user.group_id).trim() !== '';

  if (userRole === 'super_admin') {
    req.schoolId = null;
    req.groupId = null;
    return next();
  }

  if (!hasSchoolAssignment || !Number.isInteger(Number(req.user.school_id)) || Number(req.user.school_id) <= 0) {
    return permissionResponse(res, 'This account is not assigned to a school');
  }
  req.schoolId = Number(req.user.school_id);
  if (req.isHealthWorker && hasGroupAssignment
    && (!Number.isInteger(Number(req.user.group_id)) || Number(req.user.group_id) <= 0)) {
    return permissionResponse(res, 'This account has an invalid group assignment');
  }
  req.groupId = req.isHealthWorker && hasGroupAssignment ? Number(req.user.group_id) : null;

  if (req.isHealthWorker && req.method === 'PUT' && /^\/[^/]+\/?$/.test(req.path)) {
    req.body = retainHealthFields(
      req.body,
      req.baseUrl === '/api/mothers' ? MOTHER_HEALTH_FIELDS : CHILD_HEALTH_FIELDS,
    );
  }

  return next();
}

function authorizeProgressReport(req, res, next) {
  const userRole = normalizeRole(req.user?.role);
  if (!['partner', 'community_coordinator'].includes(userRole)) {
    return permissionResponse(res, 'You do not have permission to access progress reports');
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
  retainHealthFields,
};
