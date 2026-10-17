function programScopesBelongToSchool(scopes = [], { allowUnscoped = false } = {}) {
  if (!scopes.length) return allowUnscoped;
  return scopes.every((scope) => Number(scope.owned_by_school) === 1);
}

module.exports = { programScopesBelongToSchool };
