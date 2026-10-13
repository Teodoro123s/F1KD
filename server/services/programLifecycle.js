const normalizeProgramStatus = (status) => String(status || '').trim().toLowerCase();

const programStatusNeedsUpdate = (currentStatus, targetStatus) => {
  const target = normalizeProgramStatus(targetStatus);
  return ['active', 'ended'].includes(target)
    && normalizeProgramStatus(currentStatus) !== target;
};

module.exports = { normalizeProgramStatus, programStatusNeedsUpdate };
