import React, { useEffect, useRef, useState } from 'react';
import { FilterIcon } from './UserManagementIcons';

export default function RoleFilter({ options, selected, onSelect }) {
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
