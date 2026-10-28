import React from 'react';
import InfoButton from '../../../kinFlow/InfoButton';

export default function CommunityOverviewCards({ cards, selected, onSelect, toggleSelection = true }) {
  return (
    <section className="community-overview-cards" aria-label="Community totals">
      {cards.map((card) => {
        const isSelected = selected === card.key;
        const className = `community-overview-card${isSelected ? ' is-selected' : ''}`;
        const content = (
          <>
            <span className="community-overview-card__label">{card.label}</span>
            <strong className="community-overview-card__value">
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </strong>
            {(card.action || card.interactive !== false) && (
              <span className="community-overview-card__action">
                {card.action || (toggleSelection
                  ? isSelected ? 'Hide list' : 'View list'
                  : isSelected ? 'Current view' : 'View list')}
              </span>
            )}
          </>
        );

        return (
          <div key={card.key} className="community-overview-card-item">
            {card.interactive === false
              ? <div className={className}>{content}</div>
              : (
                <button
                  type="button"
                  className={className}
                  onClick={() => onSelect(toggleSelection && isSelected ? null : card.key)}
                  aria-pressed={isSelected}
                >
                  {content}
                </button>
              )}
            <InfoButton title={card.label} infoKey={card.infoKey || card.label} />
          </div>
        );
      })}
    </section>
  );
}
