import React from 'react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, breadcrumbs = [], actions = null }) {
  return (
    <header className="view-page-header">
      <div className="view-page-header__content">
        <h1 className="view-page-title">{title}</h1>
        <nav className="view-breadcrumb" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {crumb.href || crumb.to ? (
                <Link className="view-breadcrumb__item view-breadcrumb__link" to={crumb.to || crumb.href}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="view-breadcrumb__item">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="view-breadcrumb__separator" aria-hidden="true">/</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {actions && <div className="view-page-header__actions">{actions}</div>}
    </header>
  );
}
