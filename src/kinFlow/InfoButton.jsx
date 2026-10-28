import React, { useState } from 'react';
import { INFO } from './infoContent.mjs';

export default function InfoButton({ title, infoKey = title }) {
  const [open, setOpen] = useState(false);
  const explanation = INFO[infoKey];

  if (!explanation) {
    throw new Error(`Missing Kin's Flow card explanation for "${infoKey}".`);
  }

  return (
    <span className="kin-info-wrap" data-kin-info-key={infoKey}>
      <button
        type="button"
        className="kin-info-button"
        aria-label={`About ${title}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open && (
        <span className="kin-info-popover" role="note">
          <strong>{title}</strong>
          <span><b>What it is:</b> {explanation.about}</span>
          <span><b>What it’s for:</b> {explanation.purpose}</span>
        </span>
      )}
    </span>
  );
}
