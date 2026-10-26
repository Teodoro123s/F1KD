import React, { useRef, useState } from 'react';
import { PlusIcon } from '../CommunityIcons';
import PageHeader from '../../../components/ui/PageHeader';
import FloatingLayer from '../../../components/ui/FloatingLayer';

export default function CommunityToolbar({
  activeTab,
  onTabChange,
  onCreate,
  breadcrumbItems,
  navigate,
  canManage = false,
  canCreateCommunity = true,
  canCreateBatch = true,
}) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuTriggerRef = useRef(null);
  const createOptions = (activeTab === 'communities'
    ? [{ key: 'community', label: 'Create School' }, { key: 'group', label: 'Create Group' }, { key: 'batch', label: 'Create Batch' }]
    : [{ key: 'group', label: 'Create Group' }, { key: 'batch', label: 'Create Batch' }])
    .filter((option) => canCreateCommunity || option.key !== 'community')
    .filter((option) => canCreateBatch || option.key !== 'batch');

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
            {activeTab !== 'mothers' && activeTab !== 'healthWorkers' && canManage && (
              <div className="create-menu-wrapper community-create-menu">
                <button
                  ref={createMenuTriggerRef}
                  type="button"
                  className="btn-create-action module-create-button"
                  aria-haspopup="menu"
                  aria-expanded={createMenuOpen}
                  onClick={() => setCreateMenuOpen((open) => !open)}
                >
                  <PlusIcon />
                  <span>Create</span>
                  <svg className="module-create-button__chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                    <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <FloatingLayer
                  open={createMenuOpen}
                  anchorRef={createMenuTriggerRef}
                  onDismiss={() => setCreateMenuOpen(false)}
                  className="create-dropdown"
                  role="menu"
                  aria-label="Create"
                >
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
                </FloatingLayer>
              </div>
            )}
          </>
        )}
      />
    </>
  );
}
