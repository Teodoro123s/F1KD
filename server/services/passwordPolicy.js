function getPasswordPolicyError(password) {
  if (typeof password !== 'string') {
    return 'Password must be at least 12 characters and include uppercase and lowercase letters, a number, and a symbol.';
  }

  const requirements = [
    [password.length >= 12, 'at least 12 characters'],
    [/[a-z]/.test(password), 'a lowercase letter'],
    [/[A-Z]/.test(password), 'an uppercase letter'],
    [/\d/.test(password), 'a number'],
    [/[^A-Za-z0-9]/.test(password), 'a symbol'],
  ];
  const missing = requirements.filter(([met]) => !met).map(([, label]) => label);
  return missing.length
    ? `Password must include ${missing.join(', ')}.`
    : null;
}

module.exports = { getPasswordPolicyError };
