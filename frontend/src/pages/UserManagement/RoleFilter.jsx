import React, { useEffect, useRef, useState } from 'react';
import { SchoolIcon, UserRoleIcon } from './UserManagementIcons';

export default function RoleFilter({ options, selected, onSelect, filterLabel = 'Role', allLabel = 'All roles' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current || containerRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="role-filter-area" ref={containerRef}>
      <button
        type="button"
        className={`role-filter-button${isOpen ? ' open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`${filterLabel} filter`}
        title={`${filterLabel} filter`}
      >
        {filterLabel === 'School' ? <SchoolIcon /> : <UserRoleIcon />}
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
        </div>
      )}
    </div>
  );
}
