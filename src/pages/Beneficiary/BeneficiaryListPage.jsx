import React, { useEffect, useMemo, useState } from 'react';
import { matchesSearch } from '../../utils/search.mjs';
import BeneficiaryTable from './BeneficiaryTable';
import StatusFilterBar from './components/StatusFilterBar';
import EntitySearchControls from './components/EntitySearchControls';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import ModuleSelectionHint from '../../components/ui/ModuleSelectionHint';
import TableSearch from '../../components/ui/TableSearch';
import Pagination from '../../components/ui/Pagination';
import { apiGetChildren } from '../../api/children';
import { apiGetMothers } from '../../api/mothers';
import { getMotherProfileProgress, getMotherMonitoringProgress } from '../../utils/beneficiary/motherProgress';
import { getChildProfileProgress, getChildMonitoringProgress } from '../../utils/beneficiary/childProgress';
import { getCheckupScheduleStatus } from '../../utils/beneficiary/checkupStatus.mjs';
import { hasPendingBeneficiaryDocuments } from './utils/beneficiaryUtils';

const EMPTY_ARRAY = [];

const getGroupStatusByProgress = (g) => {
  if (!g) return 'Incomplete';

  if (g.monitoringProgress && typeof g.monitoringProgress === 'object') {
    return g.monitoringProgress.completed >= g.monitoringProgress.total ? 'Complete' : 'Incomplete';
  }

  if (g.status && ['Complete', 'Incomplete'].includes(g.status)) {
    return g.status;
  }

  const p = g.progress ?? 0;
  return p >= 100 ? 'Complete' : 'Incomplete';
};

function mapChildRows(children, mothers) {
  const mothersByDbId = new Map();
  mothers.forEach((mother) => {
    const dbId = mother.raw?.id || mother.original?.raw?.id || mother.id;
    if (dbId !== undefined && dbId !== null) mothersByDbId.set(String(dbId), mother);
  });
  return children.map((child) => {
    const motherId = child.mother_id || child.mother_db_id;
    const motherName = child.mother_name || [
      child.mother_first_name,
      child.mother_middle_name,
      child.mother_last_name,
    ].filter(Boolean).join(' ');
    const mother = mothersByDbId.get(String(motherId)) || (motherId ? {
      id: motherId,
      motherId: child.mother_code || motherId,
      name: motherName,
      community: child.community_name || '',
      raw: { id: motherId },
    } : undefined);
    const childName = child.name || [child.first_name, child.middle_name, child.last_name, child.suffix].filter(Boolean).join(' ');
    return {
      id: child.id,
      name: childName || 'Unnamed child',
      community: child.community_name || mother?.community || mother?.area || 'Unknown',
      progress: getChildProfileProgress(child),
      monitoringProgress: getChildMonitoringProgress(child),
      original: {
        ...child,
        mother,
        group_name: child.group_name || child.group || '',
        batch_name: child.batch_name || child.batch || '',
      },
    };
  });
}

export default function BeneficiaryListPage({ communities = EMPTY_ARRAY, groups = EMPTY_ARRAY, batches = EMPTY_ARRAY, mothers = EMPTY_ARRAY, onSelectMother, onSelectChild, batchId = '', showCommunityFilter = true }) {
  const [query, setQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState('Mother');
  const [selectedCommunityFilter, setSelectedCommunityFilter] = useState('');
  const [selectedSummaryCard, setSelectedSummaryCard] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [mothersTotal, setMothersTotal] = useState(0);
  const [childrenTotal, setChildrenTotal] = useState(0);
  const [mothersCountError, setMothersCountError] = useState('');
  const [childrenCountError, setChildrenCountError] = useState('');
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [mothersCountLoading, setMothersCountLoading] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setMothersCountLoading(true);
    apiGetMothers([], { page: 1, perPage: 1 })
      .then((response) => {
        if (active) {
          setMothersTotal(Number(response.pagination?.total) || response.mothers?.length || 0);
          setMothersCountError('');
        }
      })
      .catch((error) => {
        if (active) {
          console.error('[BeneficiaryListPage] Unable to load mother count:', error);
          setMothersCountError('Unable to load mothers.');
        }
      })
      .finally(() => {
        if (active) setMothersCountLoading(false);
      });

    setChildrenLoading(true);
    apiGetChildren([], { page: 1, perPage: 1 })
      .then((response) => {
        if (active) {
          setChildrenTotal(Number(response.pagination?.total) || response.children?.length || 0);
          setChildrenCountError('');
        }
      })
      .catch((error) => {
        if (active) {
          console.error('[BeneficiaryListPage] Unable to load child count:', error);
          setChildrenCountError('Unable to load children.');
        }
      })
      .finally(() => {
        if (active) setChildrenLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedSummaryCard) return undefined;
    let active = true;
    const term = query.trim();
    const community = communities.find((item) => item.name === selectedCommunityFilter);
    const validBatchId = /^[1-9]\d*$/.test(String(batchId)) ? String(batchId) : '';
    const needsClientFiltering = selectedStatusFilter !== 'All'
      || (Boolean(batchId) && !validBatchId)
      || (Boolean(selectedCommunityFilter) && !community?.id);
    const options = {
      ...(term ? { search: term } : {}),
      ...(community?.id ? { communityId: community.id } : {}),
      ...(validBatchId ? { batchId: validBatchId } : {}),
      ...(!needsClientFiltering ? { page, perPage } : {}),
    };
    setListLoading(true);
    setListError('');
    const timeoutId = setTimeout(async () => {
      try {
        const response = selectedEntityFilter === 'Child'
          ? await apiGetChildren([], options)
          : await apiGetMothers([], options);
        const resultKey = selectedEntityFilter === 'Child' ? 'children' : 'mothers';
        const records = Array.isArray(response) ? response : (response[resultKey] || []);
        const rows = selectedEntityFilter === 'Child' ? mapChildRows(records, mothers) : records;
        if (active) {
          setPageData({
            entity: selectedEntityFilter,
            rows,
            total: Number(response.pagination?.total) || rows.length,
            needsClientFiltering,
          });
        }
      } catch (error) {
        if (active) {
          console.error('[BeneficiaryListPage] Unable to load beneficiaries:', error);
          setPageData({ entity: selectedEntityFilter, rows: [], total: 0, needsClientFiltering });
          setListError('Unable to load beneficiaries. Please try again.');
        }
      } finally {
        if (active) setListLoading(false);
      }
    }, term ? 250 : 0);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [batchId, communities, mothers, page, perPage, query, selectedCommunityFilter, selectedEntityFilter, selectedStatusFilter, selectedSummaryCard]);

  const handleSearch = (val) => { setQuery(val); setPage(1); };
  const handlePerPageChange = (val) => { setPerPage(Number(val)); setPage(1); };

  const filteredData = useMemo(() => {
    const term = (query || '').trim();
    const sourceData = pageData?.entity === selectedEntityFilter ? pageData.rows : [];
    let data = sourceData;

    if (batchId) {
      const normalizedBatchId = String(batchId);
      data = data.filter((item) => {
        const original = item.original || item.raw || item;
        const candidates = [
          item.batchId,
          item.batch_id,
          item.batchCode,
          item.batch_code,
          original.batchId,
          original.batch_id,
          original.batchCode,
          original.batch_code,
          original.effective_batch_id,
          original.batch,
          original.batch_name,
          original.batchName,
          item.assignedBatchIds,
          original.assignedBatchIds,
        ]
          .flatMap((value) => Array.isArray(value) ? value : [value])
          .filter((value) => value !== undefined && value !== null && value !== '');

        return candidates.some((value) => String(value) === normalizedBatchId || String(value).toLowerCase() === normalizedBatchId.toLowerCase());
      });
    }

    // Normalize incoming items: support both 'group' objects and 'mother' objects
    data = data.map((item) => {
      if (selectedEntityFilter === 'Child') {
        return item;
      }
      if (item && (item.firstName || item.first_name || item.motherId || item.mother_id)) {
        const monitoringProgress = getMotherMonitoringProgress(item);
        const displayName = [
          item.firstName || item.first_name,
          item.middleName || item.middle_name,
          item.lastName || item.last_name,
          item.suffix,
        ].filter((part) => String(part || '').trim()).join(' ') || item.name || '';
        return {
          id: item.id,
          name: displayName,
          community: item.community || item.community_name || '',
          progress: getMotherProfileProgress(item),
          monitoringProgress,
          status: monitoringProgress.completed >= monitoringProgress.total ? 'Complete' : 'Incomplete',
          original: item,
        };
      }

      const monitoringProgress = selectedEntityFilter === 'Child' ? getChildMonitoringProgress(item) : getMotherMonitoringProgress(item);
      return {
        id: item.id,
        name: item.name,
        community: item.community,
        progress: item.progress ?? 0,
        monitoringProgress,
        status: monitoringProgress.completed >= monitoringProgress.total ? 'Complete' : 'Incomplete',
        original: item,
      };
    });

    if (selectedStatusFilter === 'Pending documents') {
      data = data.filter((beneficiary) => hasPendingBeneficiaryDocuments(
        beneficiary.original || beneficiary,
        selectedEntityFilter,
      ));
    } else if (selectedStatusFilter === 'Complete' || selectedStatusFilter === 'Incomplete') {
      data = data.filter((g) => getGroupStatusByProgress(g) === selectedStatusFilter);
    } else if (selectedStatusFilter === 'Pending' || selectedStatusFilter === 'Missing') {
      data = data.filter((g) => {
        const isIncomplete = getGroupStatusByProgress(g) === 'Incomplete';
        const beneficiary = g.original || g;
        return isIncomplete && getCheckupScheduleStatus(beneficiary) === selectedStatusFilter;
      });
    }

    if (selectedCommunityFilter) {
      data = data.filter((item) => String(item.community || '').trim() === selectedCommunityFilter);
    }

    if (term && pageData?.needsClientFiltering) {
      data = data.filter((record) => {
        const original = record.original || record.raw || record;
        const mother = original.mother || record.mother || {};
        return matchesSearch(term, [
          record.name, record.id, record.community, record.group, record.batch,
          record.status, record.progress, record.monitoringProgress?.status,
          original.firstName, original.first_name, original.middleName, original.middle_name,
          original.lastName, original.last_name, original.maiden_surname, original.suffix,
          original.motherCode, original.mother_code, original.childCode, original.child_code,
          original.motherId, original.mother_id, original.contactNumber, original.contact_number,
          original.address, original.area, original.purok, original.sitio, original.barangay,
          original.municipality, original.city, original.province, original.group_name,
          original.groupName, original.batch_name, original.batchName, original.batch_code,
          mother.name, mother.firstName, mother.first_name, mother.middleName, mother.middle_name,
          mother.lastName, mother.last_name, mother.maiden_surname, mother.address, mother.contact_number,
          mother.community, mother.area,
        ]);
      });
    }

    const statusOrder = { Incomplete: 0, Complete: 1 };
    return [...data].sort((a, b) => {
      const statusA = statusOrder[getGroupStatusByProgress(a)];
      const statusB = statusOrder[getGroupStatusByProgress(b)];
      if (statusA !== statusB) return statusA - statusB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [pageData, query, selectedStatusFilter, selectedEntityFilter, selectedCommunityFilter, batchId]);

  const activePageData = pageData?.entity === selectedEntityFilter ? pageData : null;
  const needsClientFiltering = activePageData?.needsClientFiltering === true;
  const totalItems = needsClientFiltering ? filteredData.length : Number(activePageData?.total || 0);
  const pageCount = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentStart = (currentPage - 1) * perPage;
  const currentRows = needsClientFiltering
    ? filteredData.slice(currentStart, currentStart + perPage)
    : filteredData;

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rangeStart = totalItems === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + currentRows.length, totalItems);

  const motherProgressByName = useMemo(() => Object.fromEntries(communities.map((comm) => [comm.name, comm.progress ?? 0])), [communities]);

  const displayRows = useMemo(() => {
    return currentRows.map((row) => {
      const groupBatchIds = row.assignedBatchIds || [];
      const groupBatches = batches.filter((batch) => groupBatchIds.includes(batch.id));
      const childProgress = groupBatches.length
        ? Math.round(groupBatches.reduce((sum, batch) => sum + (batch.progress ?? 0), 0) / groupBatches.length)
        : null;
      return { ...row, childProgress };
    });
  }, [currentRows, batches]);

  return (
    <>
      <ModuleSummaryCards
        selected={selectedSummaryCard}
        toggleOnSelect
        onSelect={(selection) => {
          setSelectedSummaryCard(selection);
          if (selection === 'mothers') setSelectedEntityFilter('Mother');
          if (selection === 'children') setSelectedEntityFilter('Child');
          setPage(1);
        }}
        cards={[
          { key: 'mothers', label: 'Registered mothers', value: mothersCountLoading ? '...' : mothersCountError ? 'Error' : mothersTotal, description: 'Show mothers', selectedDescription: 'Hide mothers' },
          { key: 'children', label: 'Registered children', value: childrenLoading ? '...' : childrenCountError ? 'Error' : childrenTotal, description: 'Show children', selectedDescription: 'Hide children' },
        ]}
      />
      {!selectedSummaryCard && <ModuleSelectionHint />}
      {selectedSummaryCard && (
        <>
          <div className="beneficiary-results">
            <section className="tabs-row beneficiary-filter-row">
              <StatusFilterBar
                mode="beneficiary"
                selectedStatusFilter={selectedStatusFilter}
                onChange={(nextStatus) => {
                  setSelectedStatusFilter(nextStatus);
                  setPage(1);
                }}
              />

              <EntitySearchControls
                selectedEntityFilter={selectedEntityFilter}
                showEntityFilter={false}
                showCommunityFilter={showCommunityFilter}
                communities={communities}
                selectedCommunity={selectedCommunityFilter}
                onCommunityChange={(value) => { setSelectedCommunityFilter(value); setPage(1); }}
                showSearch={false}
                query={query}
              />
              <TableSearch
                value={query}
                onChange={handleSearch}
                placeholder="Search names or school/group/batch"
              />
            </section>

            <BeneficiaryTable
              currentRows={displayRows}
              loading={listLoading}
              errorMessage={listError}
              filteredDataLength={totalItems}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
              perPage={perPage}
              handlePerPageChange={handlePerPageChange}
              motherProgressByName={motherProgressByName}
              onSelectMother={onSelectMother}
              onSelectChild={onSelectChild}
              communities={communities}
              groups={groups}
              batches={batches}
              entityFilter={selectedEntityFilter}
              showPagination={false}
            />
          </div>
          <Pagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            perPage={perPage}
            onPerPageChange={handlePerPageChange}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalItems={totalItems}
          />
        </>
      )}
    </>
  );
}
