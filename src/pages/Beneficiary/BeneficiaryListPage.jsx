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

export default function BeneficiaryListPage({ communities = EMPTY_ARRAY, groups = EMPTY_ARRAY, batches = EMPTY_ARRAY, mothers = EMPTY_ARRAY, loading = false, mothersError = '', onSelectMother, onSelectChild, batchId = '', showCommunityFilter = true }) {
  const [query, setQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState('Mother');
  const [selectedCommunityFilter, setSelectedCommunityFilter] = useState('');
  const [selectedSummaryCard, setSelectedSummaryCard] = useState(null);
  const [childRows, setChildRows] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [serverSearch, setServerSearch] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  useEffect(() => {
    let active = true;

    async function loadChildren() {
      setChildrenLoading(true);
      apiGetChildren()
        .then((response) => {
          const mothersByDbId = new Map();
          mothers.forEach((mother) => {
            const dbId = mother.raw?.id || mother.original?.raw?.id || mother.id;
            if (dbId !== undefined && dbId !== null) mothersByDbId.set(String(dbId), mother);
          });
          const rows = (response.children || []).map((child) => {
            const mother = mothersByDbId.get(String(child.mother_id || child.mother_db_id));
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
          if (active) setChildRows(rows);
        })
        .catch((error) => {
          if (active) {
            console.error('[BeneficiaryListPage] Unable to load children:', error);
            setChildRows([]);
          }
        })
        .finally(() => {
          if (active) setChildrenLoading(false);
        });
    }

    loadChildren();
    return () => { active = false; };
  }, [mothers]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setServerSearch(null);
      setSearchError('');
      setSearchLoading(false);
      return undefined;
    }

    let active = true;
    setServerSearch({ entity: selectedEntityFilter, rows: [] });
    setSearchError('');
    setSearchLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        let rows;
        if (selectedEntityFilter === 'Child') {
          const response = await apiGetChildren([], { search: term });
          const mothersByDbId = new Map();
          mothers.forEach((mother) => {
            const dbId = mother.raw?.id || mother.original?.raw?.id || mother.id;
            if (dbId !== undefined && dbId !== null) mothersByDbId.set(String(dbId), mother);
          });
          rows = (response.children || []).map((child) => {
            const mother = mothersByDbId.get(String(child.mother_id || child.mother_db_id));
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
        } else {
          const response = await apiGetMothers([], { search: term });
          rows = Array.isArray(response) ? response : (response.mothers || []);
        }
        if (active) setServerSearch({ entity: selectedEntityFilter, rows });
      } catch (error) {
        if (active) {
          console.error('[BeneficiaryListPage] Unable to search beneficiaries:', error);
          setServerSearch({ entity: selectedEntityFilter, rows: [] });
          setSearchError('Unable to search beneficiaries. Please try again.');
        }
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [mothers, query, selectedEntityFilter]);

  const handleSearch = (val) => { setQuery(val); setPage(1); };
  const handlePerPageChange = (val) => { setPerPage(Number(val)); setPage(1); };

  const filteredData = useMemo(() => {
    const term = (query || '').trim();
    const sourceData = query.trim()
      ? serverSearch?.entity === selectedEntityFilter ? serverSearch.rows : []
      : selectedEntityFilter === 'Child' ? childRows : mothers;
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

    if (term) {
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
  }, [mothers, childRows, serverSearch, query, selectedStatusFilter, selectedEntityFilter, selectedCommunityFilter, batchId]);

  const pageCount = Math.max(1, Math.ceil(filteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentStart = (currentPage - 1) * perPage;
  const currentRows = filteredData.slice(currentStart, currentStart + perPage);

  const rangeStart = filteredData.length === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + perPage, filteredData.length);

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
          { key: 'mothers', label: 'Registered mothers', value: loading ? '...' : mothersError ? 'Error' : mothers.length, description: 'Show mothers', selectedDescription: 'Hide mothers' },
          { key: 'children', label: 'Registered children', value: childRows.length, description: 'Show children', selectedDescription: 'Hide children' },
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
              loading={loading || searchLoading || (selectedEntityFilter === 'Child' && childrenLoading)}
              errorMessage={searchError || (selectedEntityFilter === 'Mother' ? mothersError : '')}
              filteredDataLength={filteredData.length}
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
            totalItems={filteredData.length}
          />
        </>
      )}
    </>
  );
}
