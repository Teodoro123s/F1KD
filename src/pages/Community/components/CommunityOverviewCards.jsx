import React from 'react';
import SummaryCard from '../../../components/ui/SummaryCard';

export default function CommunityOverviewCards({ cards, selected, onSelect, toggleSelection = true }) {
  return (
    <section className="community-overview-cards" aria-label="Community totals">
      {cards.map((card) => {
        const isSelected = selected === card.key;
        const action = card.action || (card.interactive !== false
          ? toggleSelection
            ? isSelected ? 'Hide list' : 'View list'
            : isSelected ? 'Current view' : 'View list'
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
