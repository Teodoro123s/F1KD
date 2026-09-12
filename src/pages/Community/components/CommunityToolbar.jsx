import React from 'react';
import { PlusIcon } from '../CommunityIcons';
import PageHeader from '../../../components/ui/PageHeader';

export default function CommunityToolbar({
  activeTab,
  query,
  entityFilter = 'Mother',
  onSearch,
  onEntityFilterChange,
  onTabChange,
  onCreate,
  breadcrumbItems,
  navigate,
  canManage = false,
}) {
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

            {activeTab !== 'mothers' && canManage && (
          <button className="btn-create-action module-create-button" onClick={onCreate}>
            <PlusIcon />
            <span>
              {activeTab === 'communities'
                ? 'Create School'
                : activeTab === 'groups'
                  ? 'Create Group'
                  : 'Create Batch'}
            </span>
          </button>
            )}
          </>
        )}
      />

    </>
  );
}
