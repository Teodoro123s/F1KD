import React, { useEffect, useRef, useState } from 'react';
import { PlusIcon } from '../CommunityIcons';
import PageHeader from '../../../components/ui/PageHeader';

export default function CommunityToolbar({
  activeTab,
  entityFilter = 'Mother',
  onEntityFilterChange,
  onTabChange,
  onCreate,
  breadcrumbItems,
  navigate,
  canManage = false,
  canCreateCommunity = true,
  canCreateBatch = true,
}) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);
  const createOptions = (activeTab === 'communities'
    ? [{ key: 'community', label: 'Create School' }, { key: 'group', label: 'Create Group' }, { key: 'batch', label: 'Create Batch' }]
    : [{ key: 'group', label: 'Create Group' }, { key: 'batch', label: 'Create Batch' }])
    .filter((option) => canCreateCommunity || option.key !== 'community')
    .filter((option) => canCreateBatch || option.key !== 'batch');

  useEffect(() => {
    if (!createMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!createMenuRef.current?.contains(event.target)) setCreateMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setCreateMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [createMenuOpen]);

  const handleCreate = (type) => {
    setCreateMenuOpen(false);
    onCreate(type);
  };

  return (
    <>
      <PageHeader
        title="Communities"
        breadcrumbs={breadcrumbItems.map((item) => ({ label: item.label, to: item.clickable ? item.to : undefined }))}
        actions={(
          <>
            {activeTab === 'mothers' && (
          <div className="entity-toggle" role="tablist" aria-label="Entity filter">
            <button
              type="button"
              className={`entity-toggle-btn${entityFilter === 'Mother' ? ' active' : ''}`}
              onClick={() => onEntityFilterChange('Mother')}
              aria-pressed={entityFilter === 'Mother'}
            >
              Mother
            </button>
            <button
              type="button"
              className={`entity-toggle-btn${entityFilter === 'Child' ? ' active' : ''}`}
              onClick={() => onEntityFilterChange('Child')}
              aria-pressed={entityFilter === 'Child'}
            >
              Child
            </button>
          </div>
            )}

            {activeTab !== 'mothers' && activeTab !== 'healthWorkers' && canManage && (
              <div className="create-menu-wrapper community-create-menu" ref={createMenuRef}>
                <button
                  type="button"
                  className="btn-create-action module-create-button"
                  aria-haspopup="menu"
                  aria-expanded={createMenuOpen}
                  onClick={() => setCreateMenuOpen((open) => !open)}
                >
                  <PlusIcon />
                  <span>Create</span>
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                    <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {createMenuOpen && (
                  <div className="create-dropdown" role="menu" aria-label="Create">
                    {createOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className="actions-dropdown-item"
                        role="menuitem"
                        onClick={() => handleCreate(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      />
    </>
  );
}
