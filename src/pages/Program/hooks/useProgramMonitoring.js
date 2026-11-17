import { useEffect, useState } from 'react';
import { apiGetProgramMonitoring, apiSetProgramMonitoring } from '../../../api/programs';
import { notifyAction } from '../../../components/ActionFeedback';
import { localDate } from '../utils/programPageUtils.mjs';

export default function useProgramMonitoring(programId) {
  const [monitorDate, setMonitorDate] = useState(localDate);
  const [monitoringStatus, setMonitoringStatus] = useState({});
  const [monitoringPending, setMonitoringPending] = useState({});
  const [monitorConfirmation, setMonitorConfirmation] = useState(null);

  useEffect(() => {
    let active = true;
    if (!programId) return undefined;
    apiGetProgramMonitoring(programId, monitorDate).then((response) => {
      if (!active) return;
      const next = {};
      (response.logs || []).forEach((log) => {
        next[`${log.beneficiary_type}:${log.beneficiary_id}`] = Boolean(log.monitored);
      });
      setMonitoringStatus(next);
    }).catch(() => {
      if (active) notifyAction('Unable to load daily monitoring status.', 'error');
    });
    return () => { active = false; };
  }, [programId, monitorDate]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const today = localDate();
      setMonitorDate((current) => current === today ? current : today);
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const toggleMonitoring = async (beneficiary, monitored, descendants = null) => {
    const beneficiaries = descendants?.length ? descendants : [beneficiary];
    const changes = beneficiaries.filter((item) => item.monitorKey && item.sourceId && item.sourceType);
    const previous = Object.fromEntries(changes.map((item) => [item.monitorKey, Boolean(monitoringStatus[item.monitorKey])]));
    const keys = changes.map((item) => item.monitorKey);
    setMonitoringStatus((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, monitored])) }));
    setMonitoringPending((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, true])) }));
    try {
      await Promise.all(changes.map((item) => apiSetProgramMonitoring(programId, {
        beneficiaryId: item.sourceId,
        beneficiaryType: item.sourceType,
        monitored,
        date: monitorDate,
      })));
    } catch (error) {
      setMonitoringStatus((current) => ({ ...current, ...previous }));
      notifyAction(error.message || 'Unable to save monitoring status.', 'error');
    } finally {
      setMonitoringPending((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, false])) }));
    }
  };

  const requestMonitoringChange = (beneficiary, monitored, descendants = null) => {
    const affectedCount = descendants?.length || 1;
    setMonitorConfirmation({ beneficiary, monitored, descendants, affectedCount });
  };

  const confirmMonitoringChange = async () => {
    if (!monitorConfirmation) return;
    const { beneficiary, monitored, descendants } = monitorConfirmation;
    setMonitorConfirmation(null);
    await toggleMonitoring(beneficiary, monitored, descendants);
  };

  return {
    monitorDate,
    monitoringStatus,
    monitoringPending,
    monitorConfirmation,
    setMonitorConfirmation,
    requestMonitoringChange,
    confirmMonitoringChange,
  };
}
