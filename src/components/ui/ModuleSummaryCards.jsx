import React from 'react';
import InfoButton from '../../kinFlow/InfoButton';

export default function ModuleSummaryCards({ cards, onSelect, selected, toggleOnSelect = false }) {
  return (
    <section className="module-summary-cards" aria-label="Module summary">
      {cards.map((card) => {
        const content = (
          <>
            <span className="module-summary-card__label">{card.label}</span>
            <strong className="module-summary-card__value">
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </strong>
            {card.description && (
              <span className="module-summary-card__description">
                {selected === card.key && toggleOnSelect
                  ? card.selectedDescription || 'Hide list'
                  : card.description}
              </span>
            )}
          </>
        );
        return (
          <div key={card.key} className="module-summary-card-item">
            {onSelect && card.interactive !== false ? (
              <button
                type="button"
                className={`module-summary-card${selected === card.key ? ' is-selected' : ''}`}
                onClick={() => onSelect(selected === card.key && toggleOnSelect ? null : card.key)}
                aria-pressed={selected === card.key}
              >
                {content}
              </button>
            ) : (
              <div className="module-summary-card">{content}</div>
            )}
            <InfoButton title={card.label} infoKey={card.infoKey || card.label} />
          </div>
        );
      })}
    </section>
  );
}
