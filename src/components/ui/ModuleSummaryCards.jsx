import React from 'react';

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
        return onSelect && card.interactive !== false ? (
          <button
            key={card.key}
            type="button"
            className={`module-summary-card${selected === card.key ? ' is-selected' : ''}`}
            onClick={() => onSelect(selected === card.key && toggleOnSelect ? null : card.key)}
            aria-pressed={selected === card.key}
          >
            {content}
          </button>
        ) : (
          <div key={card.key} className="module-summary-card">{content}</div>
        );
      })}
    </section>
  );
}
