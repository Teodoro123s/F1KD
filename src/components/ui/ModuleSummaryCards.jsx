import React from 'react';
import SummaryCard from './SummaryCard';

export default function ModuleSummaryCards({ cards, onSelect, selected, toggleOnSelect = false }) {
  return (
    <section
      className="module-summary-cards grid grid-flow-col auto-cols-[minmax(0,1fr)] auto-rows-fr gap-[0.65rem] mb-4 in-[.view-content]:mb-1"
      aria-label="Module summary"
    >
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
