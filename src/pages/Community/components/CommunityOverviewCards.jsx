import React from 'react';

export default function CommunityOverviewCards({ cards, selected, onSelect }) {
  return (
    <section className="community-overview-cards" aria-label="Community totals">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          className={`community-overview-card${selected === card.key ? ' is-selected' : ''}`}
          onClick={() => onSelect(selected === card.key ? null : card.key)}
          aria-pressed={selected === card.key}
        >
          <span className="community-overview-card__label">{card.label}</span>
          <strong className="community-overview-card__value">
            {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
          </strong>
          <span className="community-overview-card__action">
            {selected === card.key ? 'Hide list' : 'View list'}
          </span>
        </button>
      ))}
    </section>
  );
}
