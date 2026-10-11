import React from 'react';

export function formatBloodPressureInput(value) {
  const normalized = String(value ?? '').replace(/[^\d/]/g, '');
  const [systolic, ...diastolicParts] = normalized.split('/');
  if (diastolicParts.length) {
    return `${systolic.slice(0, 3)}/${diastolicParts.join('').slice(0, 3)}`;
  }

  const digits = systolic.slice(0, 6);
  return digits.length > 3 ? `${digits.slice(0, 3)}/${digits.slice(3)}` : digits;
}

export default function BloodPressureInput({
  id,
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
}) {
  return (
    <div className="blood-pressure-input">
      <input
        id={id}
        type="text"
        className={className}
        value={value ?? ''}
        onChange={(event) => onChange(formatBloodPressureInput(event.target.value))}
        placeholder="120/80"
        inputMode="numeric"
        pattern="[0-9]{2,3}/[0-9]{2,3}"
        maxLength={7}
        title="Enter systolic/diastolic pressure in mmHg, for example 120/80."
        aria-label="Blood pressure in systolic/diastolic format"
        required={required}
        disabled={disabled}
      />
      <span aria-hidden="true">mmHg</span>
    </div>
  );
}
