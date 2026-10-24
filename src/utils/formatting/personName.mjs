export const formatFirstAndSurname = (firstName, surname) => (
  [firstName, surname]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
);

export const splitFirstAndSurname = (value) => {
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] || '', surname: '' };

  return {
    firstName: parts.slice(0, -1).join(' '),
    surname: parts.at(-1),
  };
};
