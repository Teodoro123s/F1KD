import React from 'react';
import { SearchIcon, PlusIcon, BuildingIcon, GroupsIcon, BatchesIcon } from '../CommunityIcons';

export default function CommunityToolbar({
  activeTab,
  query,
  onSearch,
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

      <section className="tabs-row">
        <div className="tabs-list" role="tablist" aria-label="School sections">
          <button
            role="tab"
            aria-selected={activeTab === 'communities'}
            className={`tab-btn${activeTab === 'communities' ? ' active' : ''}`}
            onClick={() => onTabChange('communities')}
          >
            <BuildingIcon />
            <span>Schools</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'groups'}
            className={`tab-btn${activeTab === 'groups' ? ' active' : ''}`}
            onClick={() => onTabChange('groups')}
          >
            <GroupsIcon />
            <span>Groups</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'batches'}
            className={`tab-btn${activeTab === 'batches' ? ' active' : ''}`}
            onClick={() => onTabChange('batches')}
          >
            <BatchesIcon />
            <span>Batches</span>
          </button>
        </div>

        <div className="search-container">
          <div className="search-field-container">
            <SearchIcon />
            <input
              id="community-search"
              name="communitySearch"
              type="text"
              className="search-input-field"
              placeholder={
                activeTab === 'communities'
                  ? 'Search school name...'
                  : activeTab === 'groups'
                    ? 'Search group name...'
                    : activeTab === 'mothers'
                      ? 'Search mother name...'
                      : 'Search batch name...'
              }
              value={query}
              onChange={(event) => onSearch(event.target.value)}
              aria-label="Search items"
            />
          </div>
        </div>
      </section>
    </>
  );
}
