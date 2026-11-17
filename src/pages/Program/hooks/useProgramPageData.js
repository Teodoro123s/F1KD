import { useEffect, useState } from 'react';
import { apiGetChildren } from '../../../api/children';
import { apiGetProjectActivityCalendar, apiGetPrograms } from '../../../api/programs';
import { notifyAction } from '../../../components/ActionFeedback';
import { getSummary } from '../../Community/communityService';
import { filterPrograms } from '../utils/programData.js';
import { mapApiProgram } from '../utils/programPageUtils.mjs';
import { toLocalDateKey } from '../utils/projectActivityCalendarUtils.mjs';

export default function useProgramPageData({ activeTab, viewMode, isCommunityOrganizer }) {
  const [programs, setPrograms] = useState([]);
  const [programCounts, setProgramCounts] = useState({ total: 0, active: 0, ended: 0, archived: 0 });
  const [archivedPrograms, setArchivedPrograms] = useState(null);
  const [archivedProgramsLoading, setArchivedProgramsLoading] = useState(false);
  const [isLiveDataLoaded, setIsLiveDataLoaded] = useState(false);
  const [beneficiaryRecords, setBeneficiaryRecords] = useState([]);
  const [hierarchy, setHierarchy] = useState({ schools: [], groups: [], batches: [] });
  const [activityMonth, setActivityMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [projectActivities, setProjectActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [activityRetry, setActivityRetry] = useState(0);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([apiGetPrograms(), getSummary(), apiGetChildren()])
      .then(([programResult, summaryResult, childrenResult]) => {
        if (!mounted) return;
        if (programResult.status !== 'fulfilled') {
          throw programResult.reason;
        }
        const programResponse = programResult.value || {};
        const summary = summaryResult.status === 'fulfilled' ? summaryResult.value || {} : {};
        const childrenResponse = childrenResult.status === 'fulfilled' ? childrenResult.value || {} : {};
        const savedPrograms = (programResponse.programs || []).map(mapApiProgram);
        const schools = summary.communities || [];
        const groups = summary.groups || [];
        const batches = summary.batches || [];
        const batchesById = new Map(batches.map((batch) => [String(batch.id), batch]));
        setHierarchy({ schools, groups, batches });
        const mothers = (summary.mothers || []).map((mother) => ({
          id: `mother-${mother.id}`,
          sourceId: mother.id,
          sourceType: 'mother',
          monitorKey: `mother:${mother.id}`,
          school: mother.community || '',
          schoolId: mother.communityId || mother.community_id || '',
          group: mother.groupName || mother.group || '',
          groupId: mother.groupId || mother.group_id || '',
          batchId: mother.batchId || mother.batch_id || '',
          batch: batchesById.get(String(mother.batchId))?.name || mother.batch || '',
          name: mother.name,
          type: 'Mother',
          isMonitored: Boolean(mother.isMonitored ?? mother.is_monitored),
        }));
        const children = (childrenResponse.children || []).map((child) => ({
          id: `child-${child.id}`,
          sourceId: child.id,
          sourceType: 'child',
          monitorKey: `child:${child.id}`,
          school: child.community_name || '',
          schoolId: child.community_id || child.communityId || child.mother_community_id || '',
          group: child.group_name || '',
          groupId: child.group_id || child.groupId || '',
          batchId: child.batch_id || child.batchId || child.mother_batch_id || '',
          batch: child.batch_name || '',
          name: [child.first_name, child.middle_name, child.last_name].filter(Boolean).join(' '),
          type: 'Child',
          isMonitored: Boolean(child.isMonitored ?? child.is_monitored),
        }));
        setBeneficiaryRecords([...mothers, ...children]);
        setPrograms(savedPrograms);
        setProgramCounts({
          total: Number(programResponse.counts?.total ?? savedPrograms.length) || 0,
          active: Number(programResponse.counts?.active ?? filterPrograms(savedPrograms, '', 'Active').length) || 0,
          ended: Number(programResponse.counts?.ended ?? filterPrograms(savedPrograms, '', 'Ended').length) || 0,
          archived: Number(programResponse.counts?.archived) || 0,
        });
      })
      .then(() => {
        if (mounted) setIsLiveDataLoaded(true);
      })
      .catch((error) => {
        if (!mounted) return;
        notifyAction(error?.message || 'Unable to load saved projects.', 'error');
        setPrograms([]);
        setProgramCounts({ total: 0, active: 0, ended: 0, archived: 0 });
        setIsLiveDataLoaded(true);
      });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (activeTab !== 'Archived' || !isLiveDataLoaded || !isCommunityOrganizer) return undefined;
    let active = true;
    setArchivedProgramsLoading(true);
    apiGetPrograms({ archived: true })
      .then((response) => {
        if (active) setArchivedPrograms((response.programs || []).map(mapApiProgram));
      })
      .catch((error) => {
        if (active) notifyAction(error?.message || 'Unable to load archived programs.', 'error');
      })
      .finally(() => {
        if (active) setArchivedProgramsLoading(false);
      });
    return () => { active = false; };
  }, [activeTab, isCommunityOrganizer, isLiveDataLoaded]);

  useEffect(() => {
    if (viewMode) return undefined;
    let active = true;
    const from = toLocalDateKey(new Date(activityMonth.getFullYear(), activityMonth.getMonth(), 1));
    const to = toLocalDateKey(new Date(activityMonth.getFullYear(), activityMonth.getMonth() + 1, 0));
    setActivityLoading(true);
    setActivityError('');
    setProjectActivities([]);
    apiGetProjectActivityCalendar(from, to)
      .then((response) => {
        if (active) setProjectActivities(response.activities || []);
      })
      .catch((error) => {
        if (!active) return;
        setActivityError(error.message || 'Unable to load project activities.');
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });
    return () => { active = false; };
  }, [activityMonth, activityRetry, viewMode]);

  return {
    programs,
    setPrograms,
    programCounts,
    setProgramCounts,
    archivedPrograms,
    setArchivedPrograms,
    archivedProgramsLoading,
    isLiveDataLoaded,
    beneficiaryRecords,
    hierarchy,
    activityMonth,
    setActivityMonth,
    projectActivities,
    activityLoading,
    activityError,
    activityRetry,
    setActivityRetry,
  };
}
