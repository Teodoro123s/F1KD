import React, { useEffect, useRef, useState } from 'react';
import { formatDateForDisplay, maskDateInput, normalizeDateValue } from '../../utils/dateFormat';

const displayDate = (value) => {
  const formatted = formatDateForDisplay(value);
  return formatted === '—' ? '' : formatted;
};

export default function DateInput({
  id,
  className = 'form-input',
  value = '',
  onChange,
  required = false,
  disabled = false,
  readOnly = false,
  autoComplete = 'off',
  min,
  max,
  ariaLabel,
}) {
  const pickerRef = useRef(null);
  const [draft, setDraft] = useState(() => displayDate(value));
  const isWithinBounds = (normalized) => {
    const minimum = min ? normalizeDateValue(min) : '';
    const maximum = max ? normalizeDateValue(max) : '';
    return (!minimum || normalized >= minimum) && (!maximum || normalized <= maximum);
  };

  useEffect(() => {
    setDraft(displayDate(value));
  }, [value]);

  const updateDraft = (nextValue) => {
    const nextDraft = maskDateInput(nextValue);
    setDraft(nextDraft);
    const normalized = normalizeDateValue(nextDraft);
    if (!nextDraft) onChange('');
    else if (normalized && isWithinBounds(normalized)) onChange(normalized);
  };

  const commitDraft = () => {
    const normalized = normalizeDateValue(draft);
    if (normalized && isWithinBounds(normalized)) {
      setDraft(displayDate(normalized));
      onChange(normalized);
    } else if (draft) {
      setDraft('');
      onChange('');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') commitDraft();
  };

  const openPicker = () => {
    if (disabled || readOnly) return;
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  };

  return (
    <div className="date-input-container">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
        maxLength={10}
        className={className}
        value={draft}
        onChange={(event) => updateDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder="DD/MM/YYYY"
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
      />
      <input
        ref={pickerRef}
        className="native-date-picker-input"
        type="date"
        value={normalizeDateValue(value)}
        min={min}
        max={max}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue && !isWithinBounds(nextValue)) return;
          setDraft(displayDate(nextValue));
          onChange(nextValue);
        }}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled || readOnly}
      />
      {!readOnly && <button
        type="button"
        className="calendar-toggle-btn"
        onClick={openPicker}
        aria-label={`Open calendar${ariaLabel ? ` for ${ariaLabel}` : ''}`}
        disabled={disabled || readOnly}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>}
    </div>
  );
}