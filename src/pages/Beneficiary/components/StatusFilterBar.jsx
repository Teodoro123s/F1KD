import React from 'react';
import { StatusAllIcon, StatusMissingIcon, StatusPendingIcon, StatusDoneIcon } from '../BeneficiaryIcons';

const MONITOR_STATUS_OPTIONS = [
  { key: 'All', label: 'All', icon: StatusAllIcon },
  { key: 'Missing', label: 'Missing', icon: StatusMissingIcon },
  { key: 'Pending', label: 'Pending', icon: StatusPendingIcon },
  { key: 'Done', label: 'Done', icon: StatusDoneIcon },
];

const BENEFICIARY_STATUS_OPTIONS = [
  { key: 'All', label: 'All', icon: StatusAllIcon },
  { key: 'Incomplete', label: 'Incomplete', icon: StatusPendingIcon },
  { key: 'Complete', label: 'Complete', icon: StatusDoneIcon },
];

export default function StatusFilterBar({ selectedStatusFilter, onChange, mode = 'monitor' }) {
  const statusOptions = mode === 'beneficiary' ? BENEFICIARY_STATUS_OPTIONS : MONITOR_STATUS_OPTIONS;
  return (
    <div className="tabs-list" role="tablist" aria-label={`${mode === 'beneficiary' ? 'Beneficiary profile' : 'Monitor'} status filter`}>
      {statusOptions.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          role="tab"
          aria-selected={selectedStatusFilter === key}
          type="button"
          className={`tab-btn${selectedStatusFilter === key ? ' active' : ''}`}
          onClick={() => onChange(key)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
