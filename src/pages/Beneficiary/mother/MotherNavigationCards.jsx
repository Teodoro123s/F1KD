import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function MotherNavigationCards({ mother, motherId, activeCard }) {
  const navigate = useNavigate();
  const location = useLocation();
  const id = motherId || mother?.raw?.id || mother?.id || mother?.motherId || mother?.mother_id;
  const returnTo = `${location.pathname}${location.search}`;

  const navigateTo = (path, extraState = {}) => navigate(path, {
    state: { mother, returnTo, ...extraState },
  });

  const cards = [
    {
      key: 'profile',
      label: 'Mother Profile',
      action: 'View maternal details',
      onClick: () => navigateTo(`/beneficiary/mother/${id}/profile`),
    },
    {
      key: 'children',
      label: 'View Child',
      action: 'Browse linked children',
      onClick: () => navigateTo(`/beneficiary/mother/${id}/child`, {
        children: mother?.children || [],
      }),
    },
    {
      key: 'program-report',
      label: 'Project Report',
      action: 'View benefits and participation',
      onClick: () => navigateTo(`/beneficiary/mother/${id}/program-report`),
    },
    {
      key: 'monitor',
      label: 'Monitor',
      action: 'Record or review visits',
      onClick: () => navigateTo('/monitoring'),
    },
  ];

  return (
    <section className="mother-overview-actions-section" aria-label="Beneficiary actions">
      <div className="community-overview-cards mother-overview-actions">
        {cards.map((card) => {
          const isSelected = card.key === activeCard;
          return (
            <button
              key={card.key}
              type="button"
              className={`community-overview-card${isSelected ? ' is-selected' : ''}`}
              onClick={card.onClick}
              aria-current={isSelected ? 'page' : undefined}
            >
              <span className="community-overview-card__label">{card.label}</span>
              <span className="community-overview-card__action">{card.action}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
