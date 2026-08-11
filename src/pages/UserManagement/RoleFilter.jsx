import React, { useState } from 'react';
import { FilterIcon } from './UserManagementIcons';

export default function RoleFilter({ options, selected, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="role-filter-area">
      <button
        type="button"
        className={`role-filter-button${isOpen ? ' open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Role filter"
      >
        <FilterIcon />
      </button>

      {isOpen && (
        <div className="role-filter-dropdown" role="menu">
          <button
            type="button"
            className={`role-filter-item${selected === '' ? ' active' : ''}`}
            onClick={() => {
              onSelect('');
              setIsOpen(false);
            }}
            role="menuitem"
          >
            All roles
          </button>
          {options.map((role) => (
            <button
              key={role}
              type="button"
              className={`role-filter-item${selected === role ? ' active' : ''}`}
              onClick={() => {
                onSelect(role);
                setIsOpen(false);
              }}
              role="menuitem"
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
