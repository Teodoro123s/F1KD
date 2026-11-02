import React from 'react';
import SummaryCard from './SummaryCard';

export default function ModuleSummaryCards({ cards, onSelect, selected, toggleOnSelect = false }) {
  return (
    <section className="module-summary-cards" aria-label="Module summary">
      {cards.map((card) => {
        const isSelected = selected === card.key;
        return (
          <SummaryCard
            key={card.key}
            className="module-summary-card"
            label={card.label}
            value={card.value}
            description={isSelected && toggleOnSelect
              ? card.selectedDescription || 'Hide list'
              : card.description}
            selected={isSelected}
            interactive={Boolean(onSelect) && card.interactive !== false}
            onClick={() => onSelect?.(isSelected && toggleOnSelect ? null : card.key)}
            ariaPressed={isSelected}
          />
        );
      })}
    </section>
  );
}
