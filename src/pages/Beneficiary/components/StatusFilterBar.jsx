import React from 'react';

const MONITOR_STATUS_OPTIONS = [
  { key: 'All', label: 'All' },
  { key: 'Missing', label: 'Missing' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Done', label: 'Done' },
];

const BENEFICIARY_STATUS_OPTIONS = [
  { key: 'All', label: 'All' },
  { key: 'Incomplete', label: 'Incomplete' },
  { key: 'Complete', label: 'Complete' },
];

export default function StatusFilterBar({ selectedStatusFilter, onChange, mode = 'monitor' }) {
  const isBeneficiary = mode === 'beneficiary';
  const statusOptions = isBeneficiary ? BENEFICIARY_STATUS_OPTIONS : MONITOR_STATUS_OPTIONS;
  return (
    <div className={isBeneficiary ? 'beneficiary-status-filter' : 'monitoring-status-filter'}>
      <select
        aria-label={`${isBeneficiary ? 'Beneficiary' : 'Monitoring'} status filter`}
        value={selectedStatusFilter}
        onChange={(event) => onChange(event.target.value)}
      >
        {statusOptions.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
      </select>
    </div>
  );
}
