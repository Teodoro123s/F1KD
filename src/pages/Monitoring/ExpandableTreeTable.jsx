import React, { useMemo, useState } from 'react';
import UnifiedTable from '../../components/ui/UnifiedTable';

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
      monitored: '',
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
        monitored: '',
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
          monitored: '',
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
            monitored: beneficiary.isMonitored ? 'Yes' : 'No',
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

export default function ExpandableTreeTable({ data = [], monitored = {}, onMonitorChange }) {
  const [expandedPath, setExpandedPath] = useState([]);
  const rows = useMemo(() => flattenVisibleRows(data, expandedPath), [data, expandedPath]);

  const toggleRow = (row) => {
    if (!row.hasChildren) return;
    const key = row.id;
    if (row.level === 'school') setExpandedPath(expandedPath[0] === key ? [] : [key]);
    if (row.level === 'group') setExpandedPath(expandedPath[1] === key ? [expandedPath[0]] : [expandedPath[0], key]);
    if (row.level === 'batch') setExpandedPath(expandedPath[2] === key ? expandedPath.slice(0, 2) : [expandedPath[0], expandedPath[1], key]);
  };

  const columns = [
    { key: 'school', label: 'School', render: (value, row) => row.level === 'school' ? <TreeCell row={row} value={value} onClick={() => toggleRow(row)} /> : value },
    { key: 'group', label: 'Group', render: (value, row) => row.level === 'group' ? <TreeCell row={row} value={value} onClick={() => toggleRow(row)} /> : value },
    { key: 'batch', label: 'Batch', render: (value, row) => row.level === 'batch' ? <TreeCell row={row} value={value} onClick={() => toggleRow(row)} /> : value },
    { key: 'beneficiary', label: 'Beneficiary', render: (value, row) => row.level === 'beneficiary' ? <span className="monitor-tree-beneficiary">{value}</span> : value },
    { key: 'monitored', label: 'Monitored?', render: (value, row) => row.level === 'beneficiary' ? (
      onMonitorChange ? (
        <label className="monitor-tree-toggle">
          <input type="checkbox" checked={Boolean(monitored[row.node.id] ?? row.node.isMonitored)} onChange={(event) => onMonitorChange(row.node.id, event.target.checked)} />
          <span>{(monitored[row.node.id] ?? row.node.isMonitored) ? 'Yes' : 'No'}</span>
        </label>
      ) : <span className={`program-recipient-status ${row.node.isMonitored ? 'received' : 'pending'}`}>{row.node.isMonitored ? 'Yes' : 'No'}</span>
    ) : '' },
  ];

  return <UnifiedTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyMessage="No schools, groups, batches, or beneficiaries found." />;
}

function TreeCell({ row, value, onClick }) {
  return (
    <button type="button" className={`monitor-tree-cell monitor-tree-cell--${row.level}`} onClick={onClick} aria-expanded={row.expanded}>
      <span className="monitor-tree-chevron">{row.expanded ? '▼' : '▶'}</span>
      <span>{value}</span>
    </button>
  );
}

export { flattenVisibleRows };
