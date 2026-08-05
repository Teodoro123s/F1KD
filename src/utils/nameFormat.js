export function formatCompactName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const lastName = parts[parts.length - 1];
  const initials = parts
    .slice(0, parts.length - 1)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(' ');
  return `${initials} ${lastName}`;
}

export function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  const initials = parts.slice(0, 2).map((part) => part[0].toUpperCase());
  return initials.join('');
}
