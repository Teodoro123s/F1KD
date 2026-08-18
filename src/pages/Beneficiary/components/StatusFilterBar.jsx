import React from 'react';
import { StatusAllIcon, StatusMissingIcon, StatusPendingIcon, StatusDoneIcon } from '../BeneficiaryIcons';

const STATUS_OPTIONS = [
  { key: 'All', label: 'All', icon: StatusAllIcon },
  { key: 'Missing', label: 'Missing', icon: StatusMissingIcon },
  { key: 'Pending', label: 'Pending', icon: StatusPendingIcon },
  { key: 'Done', label: 'Done', icon: StatusDoneIcon },
];

export default function StatusFilterBar({ selectedStatusFilter, onChange }) {
  return (
    <div className="tabs-list" role="tablist" aria-label="Beneficiary status filter">
      {STATUS_OPTIONS.map(({ key, label, icon: Icon }) => (
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
