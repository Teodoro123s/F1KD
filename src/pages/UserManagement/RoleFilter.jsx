import React, { useRef, useState } from 'react';
import { SchoolIcon, UserRoleIcon } from './UserManagementIcons';
import FloatingLayer from '../../components/ui/FloatingLayer';

export default function RoleFilter({ options, selected, onSelect, filterLabel = 'Role', allLabel = 'All roles' }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <div className="role-filter-area">
      <button
        ref={triggerRef}
        type="button"
        className={`role-filter-button${isOpen ? ' open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`${filterLabel} filter`}
        title={`${filterLabel} filter`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {filterLabel === 'School' ? <SchoolIcon /> : <UserRoleIcon />}
      </button>

      <FloatingLayer
        open={isOpen}
        anchorRef={triggerRef}
        onDismiss={() => setIsOpen(false)}
        className="role-filter-dropdown"
        role="menu"
      >
        <button
          type="button"
          className={`role-filter-item${selected === '' ? ' active' : ''}`}
          onClick={() => {
            onSelect('');
            setIsOpen(false);
          }}
          role="menuitem"
        >
          {allLabel}
        </button>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const label = typeof option === 'string' ? option : option.label;
          return (
            <button
              key={value}
              type="button"
              className={`role-filter-item${selected === value ? ' active' : ''}`}
              onClick={() => {
                onSelect(value);
                setIsOpen(false);
              }}
              role="menuitem"
            >
              {label}
            </button>
          );
        })}
      </FloatingLayer>
    </div>
  );
}
