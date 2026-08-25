import React, { useEffect, useMemo, useState } from 'react';
import BeneficiaryTable from './BeneficiaryTable';
import StatusFilterBar from './components/StatusFilterBar';
import EntitySearchControls from './components/EntitySearchControls';
import { apiGetChildren } from '../../api/children';

const getGroupStatusByProgress = (g) => {
  if (!g) return 'Incomplete';
  const p = g.progress ?? 0;
  return p >= 100 ? 'Complete' : 'Incomplete';
};

const getMotherProfileProgress = (mother) => Math.round([
  mother?.firstName || mother?.first_name,
  mother?.lastName || mother?.last_name,
  mother?.dob,
  mother?.community || mother?.area,
  mother?.birthCertificateDocumentPath || mother?.birth_certificate_document_path,
  mother?.consentDocumentPath || mother?.consent_document_path,
].filter(Boolean).length * (100 / 6));

const getChildProfileProgress = (child) => Math.round([
  child?.mother_id || child?.motherId,
  child?.first_name || child?.firstName,
  child?.last_name || child?.lastName,
  child?.birthDocumentPath || child?.birth_document_path,
].filter(Boolean).length * 25);

export default function BeneficiaryListPage({ communities = [], batches = [], mothers = [], onSelectMother, onSelectChild }) {
  const [query, setQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState('Mother');
  const [childRows, setChildRows] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadChildren() {
      if (!mothers.length) {
        setChildRows([]);
        return;
      }

      apiGetChildren()
        .then((response) => {
          const mothersByDbId = new Map();
          mothers.forEach((mother) => {
            const dbId = mother.raw?.id || mother.original?.raw?.id || mother.id;
            if (dbId !== undefined && dbId !== null) mothersByDbId.set(String(dbId), mother);
          });
          const rows = (response.children || []).map((child) => {
            const mother = mothersByDbId.get(String(child.mother_id || child.mother_db_id));
            return {
              id: child.id,
              name: [child.first_name, child.middle_name, child.last_name, child.suffix].filter(Boolean).join(' '),
              community: child.community_name || mother?.community || mother?.area || 'Unknown',
              progress: getChildProfileProgress(child),
              original: { ...child, mother },
            };
          });
          if (active) setChildRows(rows);
        })
        .catch((error) => {
          if (active) {
            console.error('[BeneficiaryListPage] Unable to load children:', error);
            setChildRows([]);
          }
        });
    }

    loadChildren();
    return () => { active = false; };
  }, [mothers]);

  const handleSearch = (val) => { setQuery(val); setPage(1); };
  const handlePerPageChange = (val) => { setPerPage(Number(val)); setPage(1); };

  const filteredData = useMemo(() => {
    const term = (query || '').trim().toLowerCase();
    let data = selectedEntityFilter === 'Child' ? childRows : mothers;

    // Normalize incoming items: support both 'group' objects and 'mother' objects
    data = data.map((item) => {
      if (selectedEntityFilter === 'Child') {
        return item;
      }
      if (item && (item.firstName || item.motherId)) {
        // it's a mother mock object
        return {
          id: item.id,
          name: item.name || `${item.firstName} ${item.lastName}`,
          community: item.area || item.community || 'Unknown',
          progress: getMotherProfileProgress(item),
          original: item,
        };
      }
      // assume group-like object
      return { id: item.id, name: item.name, community: item.community, progress: item.progress ?? 0, original: item };
    });

    if (selectedStatusFilter !== 'All') {
      data = data.filter((g) => getGroupStatusByProgress(g) === selectedStatusFilter);
    }

    if (term) {
      // Respect the selected entity filter when searching
      data = data.filter((g) => (
        `${g.name || ''} ${g.community || ''}`.toLowerCase().includes(term)
      ));
    }

    const statusOrder = { Incomplete: 0, Complete: 1 };
    return [...data].sort((a, b) => {
      const statusA = statusOrder[getGroupStatusByProgress(a)];
      const statusB = statusOrder[getGroupStatusByProgress(b)];
      if (statusA !== statusB) return statusA - statusB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [mothers, childRows, query, selectedStatusFilter, selectedEntityFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentStart = (currentPage - 1) * perPage;
  const currentRows = filteredData.slice(currentStart, currentStart + perPage);

  const rangeStart = filteredData.length === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + perPage, filteredData.length);

  const renderPaginationButtons = () => {
    const buttons = [];
    buttons.push(
      <button key="first" type="button" className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`} onClick={() => setPage(1)} disabled={currentPage === 1} aria-label="First page">«</button>
    );
    const maxVisible = 5;
    if (pageCount <= maxVisible) {
      for (let i = 1; i <= pageCount; i += 1) {
        buttons.push(
          <button key={i} type="button" className={`pagination-btn${currentPage === i ? ' active' : ''}`} onClick={() => setPage(i)}>{i}</button>
        );
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 3; i += 1) buttons.push(<button key={i} type="button" className={`pagination-btn${currentPage === i ? ' active' : ''}`} onClick={() => setPage(i)}>{i}</button>);
      buttons.push(<span key="el-1" className="pagination-btn ellipsis">...</span>);
      buttons.push(<button key={pageCount} type="button" className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`} onClick={() => setPage(pageCount)}>{pageCount}</button>);
    } else if (currentPage >= pageCount - 2) {
      buttons.push(<button key={1} type="button" className={`pagination-btn${currentPage === 1 ? ' active' : ''}`} onClick={() => setPage(1)}>1</button>);
      buttons.push(<span key="el-2" className="pagination-btn ellipsis">...</span>);
      for (let i = pageCount - 2; i <= pageCount; i += 1) buttons.push(<button key={i} type="button" className={`pagination-btn${currentPage === i ? ' active' : ''}`} onClick={() => setPage(i)}>{i}</button>);
    } else {
      buttons.push(<button key={1} type="button" className={`pagination-btn${currentPage === 1 ? ' active' : ''}`} onClick={() => setPage(1)}>1</button>);
      buttons.push(<span key="el-3" className="pagination-btn ellipsis">...</span>);
      buttons.push(<button key={currentPage} type="button" className="pagination-btn active">{currentPage}</button>);
      buttons.push(<span key="el-4" className="pagination-btn ellipsis">...</span>);
      buttons.push(<button key={pageCount} type="button" className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`} onClick={() => setPage(pageCount)}>{pageCount}</button>);
    }
    buttons.push(<button key="last" type="button" className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`} onClick={() => setPage(pageCount)} disabled={currentPage === pageCount} aria-label="Last page">»</button>);
    return buttons;
  };

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
          query={query}
          onEntityToggle={() => setSelectedEntityFilter((current) => (current === 'Mother' ? 'Child' : 'Mother'))}
          onQueryChange={handleSearch}
        />
      </section>

      <BeneficiaryTable
        currentRows={displayRows}
        filteredDataLength={filteredData.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        perPage={perPage}
        handlePerPageChange={handlePerPageChange}
        renderPaginationButtons={renderPaginationButtons}
        motherProgressByName={motherProgressByName}
        onSelectMother={onSelectMother}
        onSelectChild={onSelectChild}
        communities={communities}
        batches={batches}
        entityFilter={selectedEntityFilter}
      />
    </>
  );
}
