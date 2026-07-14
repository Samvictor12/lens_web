import { getCurrentUser } from "@/services/auth";
import { getRolePermissionsById } from "@/services/role";
import {
  mergePermissions,
  permissionsToModuleActions,
} from "@/constants/role.constants";
import { resolveHomePath, NO_ACCESS_PATH } from "@/constants/homeRoutes";

/**
 * Resolve the first allowed Screen route for the logged-in user.
 * Used after login (before RolePermissionsProvider is mounted).
 */
export async function resolveHomePathForCurrentUser() {
  const user = getCurrentUser();
  if (!user) return "/login";

  const roleName = user.roleName || user.role?.name || "";
  const roleId = user.role_id || user.roleId;

  if (roleName.toLowerCase() === "admin" || String(roleId) === "1") {
    return "/dashboard";
  }

  if (!roleId) return NO_ACCESS_PATH;

  try {
    const data = await getRolePermissionsById(roleId);
    const list = Array.isArray(data?.permissions) ? data.permissions : [];
    const merged = mergePermissions(list);
    const moduleActions = permissionsToModuleActions(merged);
    return resolveHomePath((key) => moduleActions[key]?.Screen === true);
  } catch {
    return NO_ACCESS_PATH;
  }
}
