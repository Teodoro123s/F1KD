import React, { useMemo, useState } from 'react';
import BeneficiaryTable from './BeneficiaryTable';
import { SearchIcon, StatusAllIcon, StatusMissingIcon, StatusPendingIcon, StatusDoneIcon } from './BeneficiaryIcons';

const STATUS_OPTIONS = [
  { key: 'All', label: 'All', icon: StatusAllIcon },
  { key: 'Missing', label: 'Missing', icon: StatusMissingIcon },
  { key: 'Pending', label: 'Pending', icon: StatusPendingIcon },
  { key: 'Done', label: 'Done', icon: StatusDoneIcon },
];

const getGroupStatusByProgress = (g) => {
  if (!g) return 'Missing';
  const p = g.progress ?? 0;
  if (p >= 100) return 'Done';
  if (p === 0) return 'Missing';
  return 'Pending';
};

export default function BeneficiaryListPage({ communities = [], batches = [], groups = [], onSelectMother }) {
  const [query, setQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const handleSearch = (val) => { setQuery(val); setPage(1); };
  const handlePerPageChange = (val) => { setPerPage(Number(val)); setPage(1); };

  const filteredData = useMemo(() => {
    const term = (query || '').trim().toLowerCase();
    let data = groups || [];
    if (selectedStatusFilter !== 'All') {
      data = data.filter((g) => getGroupStatusByProgress(g) === selectedStatusFilter);
    }
    if (term) {
      data = data.filter((g) => (g.name || '').toLowerCase().includes(term) || (g.community || '').toLowerCase().includes(term));
    }
    if (selectedStatusFilter === 'All') {
      const statusOrder = { Missing: 0, Pending: 1, Done: 2 };
      data = [...data].sort((a, b) => {
        const statusA = statusOrder[getGroupStatusByProgress(a)];
        const statusB = statusOrder[getGroupStatusByProgress(b)];
        if (statusA !== statusB) return statusA - statusB;
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    return data;
  }, [groups, query, selectedStatusFilter]);

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
      <section className="tabs-row">
        <div className="tabs-list" role="tablist" aria-label="Beneficiary status filter">
          {STATUS_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button key={key} role="tab" aria-selected={selectedStatusFilter === key} type="button" className={`tab-btn${selectedStatusFilter === key ? ' active' : ''}`} onClick={() => { setSelectedStatusFilter(key); setPage(1); }}>
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="search-container">
          <SearchIcon />
          <input type="text" className="search-input-field" placeholder="Search child name..." value={query} onChange={(e) => handleSearch(e.target.value)} aria-label="Search items" />
        </div>
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
        communities={communities}
        batches={batches}
      />
    </>
  );
}
