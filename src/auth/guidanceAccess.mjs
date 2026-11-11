export function shouldLoadGuidancePreferences(user) {
  return Boolean(user?.id && user?.has_accepted_terms !== false);
}
