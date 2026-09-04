import React from 'react';

export default function PageHeader({ title, breadcrumbs = [], actions = null }) {
  return (
    <header className="view-page-header">
      <div className="view-page-header__content">
        <nav className="view-breadcrumb" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              <span className="view-breadcrumb__item">{crumb.label}</span>
              {index < breadcrumbs.length - 1 && (
                <span className="view-breadcrumb__separator" aria-hidden="true">/</span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <h1 className="view-page-title">{title}</h1>
      </div>

      {actions && <div className="view-page-header__actions">{actions}</div>}
    </header>
  );
}
