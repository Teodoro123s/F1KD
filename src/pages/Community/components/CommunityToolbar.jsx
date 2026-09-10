import React from 'react';
import { PlusIcon } from '../CommunityIcons';

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
      <header className="community-header">
        <div className="community-title-section">
          <h1>Communities</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, index) => (
              <span key={`${item.label}-${index}`} className="breadcrumb-item">
                {item.clickable ? (
                  <button type="button" className="breadcrumb-link" onClick={() => navigate(item.to)}>
                    {item.label}
                  </button>
                ) : (
                  <span className="breadcrumb-current">{item.label}</span>
                )}
                {index < breadcrumbItems.length - 1 && <span className="breadcrumb-separator">›</span>}
              </span>
            ))}
          </nav>
        </div>

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
          <button className="btn-create-action" onClick={onCreate}>
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
      </header>

    </>
  );
}
