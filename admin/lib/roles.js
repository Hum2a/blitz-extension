/** Role hierarchy: user < admin < developer */
export const ROLES = ["user", "admin", "developer"];

export function roleRank(role) {
  const i = ROLES.indexOf(role);
  return i === -1 ? 0 : i;
}

export function canAccessAdmin(role) {
  return roleRank(role) >= roleRank("admin");
}

export function canManageRoles(role) {
  return role === "developer";
}

export function canManageConfig(role) {
  return role === "developer";
}

export function canDeleteUsers(role) {
  return role === "developer";
}

export function canResetSync(role) {
  return role === "developer";
}

export function canModerateUsers(role) {
  return roleRank(role) >= roleRank("admin");
}
