import React from 'react';

export default function PageHeader({ title, actions = null }) {
  return (
    <header className="view-page-header">
      <div className="view-page-header__content">
        <h1 className="view-page-title">{title}</h1>
      </div>

      {actions && <div className="view-page-header__actions">{actions}</div>}
    </header>
  );
}
