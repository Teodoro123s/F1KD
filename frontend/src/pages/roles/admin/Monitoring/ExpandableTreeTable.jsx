import React, { useMemo, useState } from 'react';
import UnifiedTable from '../../../../components/ui/UnifiedTable';

function getNodeKey(node) {
  return `${node.level}-${node.id}`;
}

function flattenVisibleRows(data, expandedPath) {
  const rows = [];
  const expandedSchool = expandedPath[0];
  const expandedGroup = expandedPath[1];
  const expandedBatch = expandedPath[2];

  data.forEach((school) => {
    const schoolKey = getNodeKey({ level: 'school', id: school.id });
    rows.push({
      id: schoolKey,
      level: 'school',
      school: school.name,
      group: '',
      batch: '',
      beneficiary: '',
      hasChildren: school.groups.length > 0,
      expanded: expandedSchool === schoolKey,
      node: school,
    });

    if (expandedSchool !== schoolKey) return;
    school.groups.forEach((group) => {
      const groupKey = getNodeKey({ level: 'group', id: group.id });
      rows.push({
        id: groupKey,
        level: 'group',
        school: '',
        group: group.name,
        batch: '',
        beneficiary: '',
        hasChildren: group.batches.length > 0,
        expanded: expandedGroup === groupKey,
        node: group,
      });

      if (expandedGroup !== groupKey) return;
      group.batches.forEach((batch) => {
        const batchKey = getNodeKey({ level: 'batch', id: batch.id });
        rows.push({
          id: batchKey,
          level: 'batch',
          school: '',
          group: '',
          batch: batch.name,
          beneficiary: '',
          hasChildren: batch.beneficiaries.length > 0,
          expanded: expandedBatch === batchKey,
          node: batch,
        });

        if (expandedBatch !== batchKey) return;
        batch.beneficiaries.forEach((beneficiary) => {
          rows.push({
            id: `beneficiary-${beneficiary.id}`,
            level: 'beneficiary',
            school: '',
            group: '',
            batch: '',
            beneficiary: beneficiary.name,
            hasChildren: false,
            expanded: false,
            node: beneficiary,
          });
        });
      });
    });
  });

  return rows;
}

export default function ExpandableTreeTable({ data = [], onBeneficiaryClick, onHistoryClick, onNodeClick, expandedPath: controlledExpandedPath }) {
  const [internalExpandedPath, setInternalExpandedPath] = useState([]);
  const expandedPath = controlledExpandedPath ?? internalExpandedPath;
  const rows = useMemo(() => flattenVisibleRows(data, expandedPath), [data, expandedPath]);

  const toggleRow = (row) => {
    if (controlledExpandedPath) return;
    if (!row.hasChildren) return;
    const key = row.id;
    setInternalExpandedPath((currentPath) => {
      if (row.level === 'school') return currentPath[0] === key ? [] : [key];
      if (row.level === 'group') return currentPath[1] === key ? [currentPath[0]] : [currentPath[0], key];
      if (row.level === 'batch') return currentPath[2] === key ? currentPath.slice(0, 2) : [currentPath[0], currentPath[1], key];
      return currentPath;
    });
  };

  const handleRowClick = (row) => {
    if (onNodeClick) {
      onNodeClick(row.node, row.level);
      return;
    }
    toggleRow(row);
  };

  const columns = [
    { key: 'school', label: 'School', render: (value, row) => row.level === 'school' ? <TreeCell row={row} value={value} onClick={() => handleRowClick(row)} /> : value },
    { key: 'group', label: 'Group', render: (value, row) => row.level === 'group' ? <TreeCell row={row} value={value} onClick={() => handleRowClick(row)} /> : value },
    { key: 'batch', label: 'Batch', render: (value, row) => row.level === 'batch' ? <TreeCell row={row} value={value} onClick={() => handleRowClick(row)} /> : value },
    { key: 'beneficiary', label: 'Beneficiary', render: (value, row) => row.level === 'beneficiary' ? (
      onBeneficiaryClick ? <button type="button" className="monitor-tree-beneficiary monitor-tree-beneficiary-button" onClick={() => onBeneficiaryClick(row.node)}>{value}</button> : <span className="monitor-tree-beneficiary">{value}</span>
    ) : value },
    { key: 'history', label: 'Receipt history', render: (_, row) => {
      if (!onHistoryClick) return null;
      const label = row.level === 'beneficiary' ? 'History' : 'View';
      return <button type="button" className="view-btn view-btn--secondary" onClick={() => onHistoryClick(row.node, row.level)}>{label}</button>;
    } },
  ];

  return <UnifiedTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyMessage="No schools, groups, batches, or beneficiaries found." />;
}

function TreeCell({ row, value, onClick }) {
  if (!row.hasChildren) return <span className={`monitor-tree-cell monitor-tree-cell--${row.level} monitor-tree-cell--leaf`}><span className="monitor-tree-chevron" aria-hidden="true" /> <span>{value}</span></span>;
  return (
    <button type="button" className={`monitor-tree-cell monitor-tree-cell--${row.level}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onClick(); }} aria-expanded={row.expanded}>
      <span className="monitor-tree-chevron">{row.expanded ? '▼' : '▶'}</span>
      <span>{value}</span>
    </button>
  );
}

export { flattenVisibleRows };
