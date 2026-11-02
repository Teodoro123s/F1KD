import React from 'react';
import SummaryCard from '../../../components/ui/SummaryCard';

export default function CommunityOverviewCards({ cards, selected, onSelect, toggleSelection = true }) {
  return (
    <section className="community-overview-cards" aria-label="Community totals">
      {cards.map((card) => {
        const isSelected = selected === card.key;
        const listLabel = card.listLabel || card.label.replace(/^Total /, '').toLowerCase();
        const action = card.action || (card.interactive !== false
          ? toggleSelection
            ? isSelected ? `Hide ${listLabel}` : `Show ${listLabel}`
            : isSelected ? 'Current view' : `Show ${listLabel}`
          : undefined);
        return (
          <SummaryCard
            key={card.key}
            className="community-overview-card"
            label={card.label}
            value={card.value}
            action={action}
            selected={isSelected}
            interactive={card.interactive !== false}
            onClick={() => onSelect?.(toggleSelection && isSelected ? null : card.key)}
            ariaPressed={isSelected}
          />
        );
      })}
    </section>
  );
}
