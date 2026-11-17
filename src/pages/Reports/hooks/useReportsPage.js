import { useEffect, useMemo, useState } from 'react';
import { apiGetActivityReport, apiGetActivityUsers, apiGetReportScopes } from '../../../api/reports';
import { fillDailyTimeSeries, getRollingDateRange } from '../../../utils/analytics/dailyTimeSeries';
import { getReportDateRange } from '../utils/reportUtils.mjs';

const EMPTY_COUNTS = { signIns: 0 };

export default function useReportsPage() {
  const [selectedCard, setSelectedCard] = useState(null);
  const [scopeLevel, setScopeLevel] = useState('school');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [viewMode, setViewMode] = useState('graph');
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('all');
  const [selectedGraphDate, setSelectedGraphDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [report, setReport] = useState({ activities: [], total: 0, counts: EMPTY_COUNTS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const action = 'sign_in';
  const reportSchoolId = scopeLevel === 'school' || scopeLevel === 'group' ? selectedSchoolId : '';
  const reportGroupId = scopeLevel === 'group' ? selectedGroupId : '';
  const reportActorUserId = scopeLevel === 'individual' ? selectedUserId : '';
  const presetDateRange = getReportDateRange(dateRangePreset);
  const from = selectedGraphDate || presetDateRange.from;
  const to = selectedGraphDate || presetDateRange.to;
  const recentChartRange = useMemo(() => getRollingDateRange(30), []);
  const chartFrom = from || recentChartRange.from;
  const chartTo = to || recentChartRange.to;
  const visibleGroups = selectedSchoolId
    ? groups.filter((group) => String(group.schoolId) === String(selectedSchoolId))
    : groups;
  const visibleUsers = users.filter((user) => {
    if (scopeLevel === 'school' && selectedSchoolId) return String(user.schoolId || '') === String(selectedSchoolId);
    if (scopeLevel === 'group' && selectedGroupId) return String(user.groupId || '') === String(selectedGroupId);
    return true;
  });

  useEffect(() => {
    if (!selectedCard) return undefined;
    let active = true;
    Promise.all([apiGetActivityUsers(), apiGetReportScopes()])
      .then(([userResponse, scopeResponse]) => {
        if (!active) return;
        setUsers(userResponse.users || []);
        setSchools(scopeResponse.schools || []);
        setGroups(scopeResponse.groups || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load users for login reports.');
      });
    return () => { active = false; };
  }, [selectedCard]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiGetActivityReport({
      page,
      perPage,
      action,
      actorUserId: reportActorUserId,
      schoolId: reportSchoolId,
      groupId: reportGroupId,
      search,
      from,
      to,
      chartFrom,
      chartTo,
    })
      .then((response) => {
        if (!active) return;
        setReport({
          activities: response.activities || [],
          dailyActivity: fillDailyTimeSeries(response.dailyActivity || [], chartFrom, chartTo),
          total: Number(response.total) || 0,
          counts: { ...EMPTY_COUNTS, ...(response.counts || {}) },
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setReport({ activities: [], dailyActivity: [], total: 0, counts: EMPTY_COUNTS });
        setError(requestError.message || 'Unable to load login reports.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, perPage, action, reportActorUserId, reportSchoolId, reportGroupId, search, from, to, chartFrom, chartTo]);

  const pageCount = Math.max(1, Math.ceil(report.total / perPage));
  const start = report.total ? (page - 1) * perPage + 1 : 0;
  const end = Math.min(page * perPage, report.total);

  const selectCard = (key) => {
    setSelectedCard(key);
    setPage(1);
  };

  const changeScopeLevel = (value) => {
    setScopeLevel(value);
    setSelectedGraphDate('');
    setSelectedSchoolId('');
    setSelectedGroupId('');
    setSelectedUserId('');
    setPage(1);
  };

  const changeSchool = (value) => {
    setSelectedSchoolId(value);
    setSelectedGraphDate('');
    setSelectedGroupId('');
    setPage(1);
  };

  const changeGroup = (value) => {
    setSelectedGroupId(value);
    setSelectedGraphDate('');
    setPage(1);
  };

  const changeUser = (value) => {
    setSelectedUserId(value);
    setSelectedGraphDate('');
    setPage(1);
  };

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const changeDateRangePreset = (value) => {
    setDateRangePreset(value);
    setSelectedGraphDate('');
    setPage(1);
  };

  const showGraph = () => {
    setSelectedGraphDate('');
    setViewMode('graph');
  };

  const selectGraphDate = (date) => {
    setSelectedGraphDate(date);
    setViewMode('table');
    setPage(1);
  };

  const clearGraphDate = () => {
    setSelectedGraphDate('');
    setPage(1);
  };

  const changePerPage = (value) => {
    setPerPage(Number(value));
    setPage(1);
  };

  return {
    selectedCard,
    scopeLevel,
    selectedSchoolId,
    selectedGroupId,
    selectedUserId,
    viewMode,
    users,
    schools,
    visibleGroups,
    visibleUsers,
    search,
    dateRangePreset,
    selectedGraphDate,
    page,
    perPage,
    report,
    loading,
    error,
    pageCount,
    start,
    end,
    from,
    to,
    chartFrom,
    chartTo,
    selectCard,
    changeScopeLevel,
    changeSchool,
    changeGroup,
    changeUser,
    changeSearch,
    changeDateRangePreset,
    setViewMode,
    showGraph,
    selectGraphDate,
    clearGraphDate,
    setPage,
    changePerPage,
  };
}
