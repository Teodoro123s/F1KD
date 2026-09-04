const DEFAULT_MONITORING_INTERVAL = 'weekly';
const DEFAULT_ALERT_THRESHOLD = 0;

/**
 * Compose monitoring metadata around the record created by the Beneficiary module.
 * The source entity remains nested so its fields have one owner.
 */
export function createMonitorModel(entity, options = {}) {
  if (!entity || typeof entity !== 'object') {
    throw new TypeError('Monitor entity must be an object');
  }

  return {
    entity,
    monitoringInterval: options.monitoringInterval || DEFAULT_MONITORING_INTERVAL,
    alertThreshold: Number.isFinite(options.alertThreshold)
      ? options.alertThreshold
      : DEFAULT_ALERT_THRESHOLD,
    isActive: options.isActive !== false,
  };
}
