import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ChildNavigationCards({ child, mother, activeCard }) {
  const navigate = useNavigate();
  const location = useLocation();
  const childId = child?.id || child?.childId || child?.child_id || child?.child_code;
  const childMotherId = child?.mother_id || child?.motherId || child?.mother_code;
  const linkedMother = mother || (childMotherId
    ? {
      id: childMotherId,
      motherId: childMotherId,
      name: child.motherName || [child.mother_first_name, child.mother_last_name].filter(Boolean).join(' '),
    }
    : null);
  const motherId = linkedMother?.raw?.id
    || linkedMother?.id
    || linkedMother?.motherId
    || linkedMother?.mother_id
    || linkedMother?.mother_code
    || childMotherId;
  const returnTo = `${location.pathname}${location.search}`;
  const navigationState = { child, mother: linkedMother, returnTo };

  const navigateToMonitor = () => navigate('/monitoring', {
    state: {
      ...navigationState,
      returnToState: navigationState,
    },
  });

  const cards = [
    {
      key: 'profile',
      label: 'Child Profile',
      action: 'View child details',
      disabled: !childId,
      onClick: () => navigate(`/beneficiary/child/${childId}/profile`, { state: navigationState }),
    },
    {
      key: 'mother',
      label: 'View Mother',
      action: motherId ? 'Open linked profile' : 'No linked mother available',
      disabled: !motherId,
      onClick: () => navigate(`/beneficiary/mother/${motherId}`, {
        state: { mother: linkedMother, returnTo },
      }),
    },
    {
      key: 'program-report',
      label: 'Project Report',
      action: 'View benefits and participation',
      disabled: !childId,
      onClick: () => navigate(`/beneficiary/child/${childId}/program-report`, { state: navigationState }),
    },
    {
      key: 'monitor',
      label: 'Monitor',
      action: 'Record or review visits',
      disabled: !childId,
      onClick: navigateToMonitor,
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
              disabled={card.disabled}
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
